const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../config/upload');
const { uploadBuffer } = require('../config/cloudinary');
const router = express.Router();

// GET my profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      'SELECT * FROM student_profiles WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found. Please create one.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE or UPDATE my profile (upsert)
router.put('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { education, skills, certifications, resume_link, github_link, preferred_location } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM student_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // Update
      await db.query(
        `UPDATE student_profiles 
         SET education = ?, skills = ?, certifications = ?, resume_link = ?, github_link = ?, preferred_location = ?
         WHERE user_id = ?`,
        [education, skills, certifications, resume_link, github_link, preferred_location, userId]
      );
      return res.json({ message: 'Profile updated successfully' });
    } else {
      // Create
      await db.query(
        `INSERT INTO student_profiles (user_id, education, skills, certifications, resume_link, github_link, preferred_location)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, education, skills, certifications, resume_link, github_link, preferred_location]
      );
      return res.status(201).json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPLOAD resume file (PDF only) — separate from the resume_link text field
router.post('/upload-resume', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
        const result = await uploadBuffer(req.file.buffer, {
      folder: 'launchpad/resumes',
      resource_type: 'raw', // PDFs are stored as-is; raw public_ids must include the extension
      public_id: `resume-${userId}-${Date.now()}.pdf`,
    });
    const filePath = result.secure_url;

    const [existing] = await db.query('SELECT id FROM student_profiles WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      await db.query('UPDATE student_profiles SET resume_file = ? WHERE user_id = ?', [filePath, userId]);
    } else {
      await db.query('INSERT INTO student_profiles (user_id, resume_file) VALUES (?, ?)', [userId, filePath]);
    }

    res.json({ message: 'Resume uploaded successfully', resume_file: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REMOVE uploaded resume
router.delete('/remove-resume', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('UPDATE student_profiles SET resume_file = NULL WHERE user_id = ?', [userId]);
    res.json({ message: 'Resume removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;