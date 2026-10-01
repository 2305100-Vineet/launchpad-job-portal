const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');

// Fail fast: without this, every login would crash with a confusing error
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Check your .env file / hosting environment variables.');
  process.exit(1);
}

const app = express();

// Hosting platforms put a proxy in front of the app; this lets rate limiting see the real client IP
app.set('trust proxy', 1);

// Only the frontend(s) listed in FRONTEND_URL may call this API from a browser.
// Comma-separate multiple origins. Defaults to the local Vite dev server.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/', (req, res) => {
  res.send('Job Portal API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});