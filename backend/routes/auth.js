const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');
const { sendOtpEmail, sendWelcomeEmail } = require('../config/mailer');
const uploadPhoto = require('../config/uploadPhoto');
const { uploadBuffer } = require('../config/cloudinary');

const router = express.Router();

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// ---- Rate limiters (in-memory, per client IP) ----
const tooMany = { message: 'Too many attempts. Please try again in a few minutes.' };

// Only FAILED logins count, so normal use is never blocked
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// Requesting OTP emails: keeps people from spamming an inbox
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// Checking / using an OTP: makes guessing the 6 digits impractical
const otpCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    if (!['student', 'recruiter'].includes(role)) {
      return res.status(400).json({ message: 'Role must be student or recruiter' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

        // Fire-and-forget: a slow or failing email must never block or break registration
    sendWelcomeEmail(email, name, role).catch((err) =>
      console.error('Welcome email failed:', err.message)
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPLOAD account photo (any logged-in user, optional)
router.post('/upload-photo', verifyToken, uploadPhoto.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const userId = req.user.id;
        const result = await uploadBuffer(req.file.buffer, {
      folder: 'launchpad/photos',
      resource_type: 'image',
      public_id: `photo-${userId}-${Date.now()}`,
    });
    const filePath = result.secure_url;

    await db.query('UPDATE users SET photo = ? WHERE id = ?', [filePath, userId]);

    const [rows] = await db.query('SELECT id, name, email, role, photo FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Photo uploaded successfully', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REMOVE account photo
router.delete('/remove-photo', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('UPDATE users SET photo = NULL WHERE id = ?', [userId]);
    const [rows] = await db.query('SELECT id, name, email, role, photo FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Photo removed', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE own account
router.delete('/delete-account', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// FORGOT PASSWORD — request OTP
router.post('/forgot-password', otpRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Sorry, no account exists with this email' });
    }

    const userId = users[0].id;
    // crypto.randomInt is cryptographically secure (Math.random is not)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Only the newest OTP should work: retire any earlier unused ones
    await db.query('UPDATE password_resets SET used = TRUE WHERE user_id = ? AND used = FALSE', [userId]);

    await db.query(
      'INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, ?)',
      [userId, otp, expiresAt]
    );

    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// VERIFY OTP
router.post('/verify-otp', otpCheckLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Sorry, no account exists with this email' });
    }

    const userId = users[0].id;
    const [resets] = await db.query(
      `SELECT * FROM password_resets 
       WHERE user_id = ? AND otp = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otp]
    );

    if (resets.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET PASSWORD
router.post('/reset-password', otpCheckLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Sorry, no account exists with this email' });
    }

    const userId = users[0].id;
    const [resets] = await db.query(
      `SELECT * FROM password_resets 
       WHERE user_id = ? AND otp = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otp]
    );

    if (resets.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    await db.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [resets[0].id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;