const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// CREATE a job (recruiter only)
router.post('/', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { title, description, company_name, location, job_type, required_skills, eligibility, ctc_min, ctc_max, deadline } = req.body;

    if (!title || !description || !company_name) {
      return res.status(400).json({ message: 'Title, description, and company name are required' });
    }

    const [result] = await db.query(
      `INSERT INTO jobs (recruiter_id, title, description, company_name, location, job_type, required_skills, eligibility, ctc_min, ctc_max, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [recruiterId, title, description, company_name, location, job_type || 'full-time', required_skills, eligibility, ctc_min || null, ctc_max || null, deadline || null]
    );

    res.status(201).json({ message: 'Job posted successfully', jobId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all jobs posted by the logged-in recruiter, with per-job applicant status breakdown
router.get('/my-jobs', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const [jobs] = await db.query(
      `SELECT jobs.*,
              SUM(CASE WHEN applications.status = 'applied' THEN 1 ELSE 0 END) AS applied_count,
              SUM(CASE WHEN applications.status = 'under_review' THEN 1 ELSE 0 END) AS under_review_count,
              SUM(CASE WHEN applications.status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count,
              SUM(CASE WHEN applications.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
              SUM(CASE WHEN applications.status = 'selected' THEN 1 ELSE 0 END) AS selected_count
       FROM jobs
       LEFT JOIN applications ON applications.job_id = jobs.id
       WHERE jobs.recruiter_id = ?
       GROUP BY jobs.id
       ORDER BY jobs.created_at DESC`,
      [recruiterId]
    );
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// RECRUITER dashboard stats
router.get('/my-stats', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
         COUNT(DISTINCT jobs.id) AS total_jobs,
         COUNT(applications.id) AS total_applicants
       FROM jobs
       LEFT JOIN applications ON applications.job_id = jobs.id
       WHERE jobs.recruiter_id = ?`,
      [recruiterId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all jobs with optional search & filters (any logged-in user)
// For students, also attaches a rule-based match_score, missing_skills, and location_match
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, job_type, location, sort, min_ctc } = req.query;

    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR company_name LIKE ? OR required_skills LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (job_type) {
      query += ' AND job_type = ?';
      params.push(job_type);
    }

    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }

    if (min_ctc) {
      query += ' AND COALESCE(ctc_max, ctc_min) >= ?';
      params.push(Number(min_ctc));
    }

    // Auto-hide expired postings from the general browse listing
    query += ' AND (deadline IS NULL OR deadline >= CURDATE())';

    query += ' ORDER BY created_at DESC';

    const [jobs] = await db.query(query, params);

    // Rule-based matching, students only
    if (req.user.role === 'student') {
      const [profiles] = await db.query(
        'SELECT skills, preferred_location FROM student_profiles WHERE user_id = ?',
        [req.user.id]
      );
      const studentProfile = profiles[0];

      const studentSkills = studentProfile?.skills
        ? studentProfile.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : [];
      const preferredLocation = studentProfile?.preferred_location?.trim().toLowerCase() || '';

      jobs.forEach(job => {
        const requiredSkills = job.required_skills
          ? job.required_skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
          : [];

        let skillScore = 0;
        if (requiredSkills.length > 0) {
          const matchedSkills = requiredSkills.filter(skill => studentSkills.includes(skill));
          skillScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);
        }

        job.match_score = skillScore;
        job.missing_skills = requiredSkills.filter(skill => !studentSkills.includes(skill));
        job.location_match = !!(preferredLocation && job.location && job.location.trim().toLowerCase() === preferredLocation);
      });

      if (sort === 'match') {
        jobs.sort((a, b) => b.match_score - a.match_score);
      }
    }

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single job by id (any logged-in user)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [jobs] = await db.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(jobs[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE a job (recruiter only, must own the job)
router.put('/:id', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const jobId = req.params.id;
    const { title, description, company_name, location, job_type, required_skills, eligibility, ctc_min, ctc_max, deadline } = req.body;

    const [existing] = await db.query('SELECT id FROM jobs WHERE id = ? AND recruiter_id = ?', [jobId, recruiterId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job not found or you do not have permission to edit it' });
    }

    await db.query(
      `UPDATE jobs 
       SET title = ?, description = ?, company_name = ?, location = ?, job_type = ?, required_skills = ?, eligibility = ?, ctc_min = ?, ctc_max = ?, deadline = ?
       WHERE id = ?`,
      [title, description, company_name, location, job_type, required_skills, eligibility, ctc_min || null, ctc_max || null, deadline || null, jobId]
    );

    res.json({ message: 'Job updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a job (recruiter only, must own the job)
router.delete('/:id', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const jobId = req.params.id;

    const [existing] = await db.query('SELECT id FROM jobs WHERE id = ? AND recruiter_id = ?', [jobId, recruiterId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job not found or you do not have permission to delete it' });
    }

    await db.query('DELETE FROM jobs WHERE id = ?', [jobId]);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;