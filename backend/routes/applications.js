const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { sendStatusUpdateEmail } = require('../config/mailer');

const router = express.Router();

// STUDENT applies to a job
router.post('/:jobId', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const jobId = req.params.jobId;

    const [job] = await db.query('SELECT id FROM jobs WHERE id = ?', [jobId]);
    if (job.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const [existing] = await db.query(
      'SELECT id FROM applications WHERE job_id = ? AND student_id = ?',
      [jobId, studentId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already applied to this job' });
    }

    await db.query(
      'INSERT INTO applications (job_id, student_id) VALUES (?, ?)',
      [jobId, studentId]
    );

    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// STUDENT dashboard stats
router.get('/my-stats', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const [rows] = await db.query(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
         SUM(CASE WHEN status = 'selected' THEN 1 ELSE 0 END) AS selected,
         SUM(CASE WHEN status IN ('applied', 'under_review') THEN 1 ELSE 0 END) AS pending
       FROM applications
       WHERE student_id = ?`,
      [studentId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// STUDENT views their own applications
router.get('/my-applications', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const [applications] = await db.query(
      `SELECT applications.id, applications.status, applications.applied_at,
              jobs.title, jobs.company_name, jobs.job_type, jobs.location
       FROM applications
       JOIN jobs ON applications.job_id = jobs.id
       WHERE applications.student_id = ?
       ORDER BY applications.applied_at DESC`,
      [studentId]
    );
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// RECRUITER views applicants for a specific job they posted
// Each applicant gets a rule-based match_score (skill overlap %, same logic as student-side job matching)
router.get('/job/:jobId', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const jobId = req.params.jobId;

    const [job] = await db.query(
      'SELECT id, required_skills FROM jobs WHERE id = ? AND recruiter_id = ?',
      [jobId, recruiterId]
    );
    if (job.length === 0) {
      return res.status(404).json({ message: 'Job not found or you do not have permission to view its applicants' });
    }

    const [applicants] = await db.query(
      `SELECT applications.id, applications.status, applications.applied_at,
              users.name, users.email, users.photo, student_profiles.skills
       FROM applications
       JOIN users ON applications.student_id = users.id
       LEFT JOIN student_profiles ON student_profiles.user_id = users.id
       WHERE applications.job_id = ?
       ORDER BY applications.applied_at DESC`,
      [jobId]
    );

    const requiredSkills = job[0].required_skills
      ? job[0].required_skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    applicants.forEach(applicant => {
      const applicantSkills = applicant.skills
        ? applicant.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : [];

      let matchScore = 0;
      if (requiredSkills.length > 0) {
        const matched = requiredSkills.filter(skill => applicantSkills.includes(skill));
        matchScore = Math.round((matched.length / requiredSkills.length) * 100);
      }
      applicant.match_score = matchScore;
      delete applicant.skills; // internal-only, not needed by the frontend
    });

    applicants.sort((a, b) => b.match_score - a.match_score);

    res.json(applicants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// RECRUITER updates an applicant's status
router.put('/:id/status', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const applicationId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['applied', 'under_review', 'shortlisted', 'rejected', 'selected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const [rows] = await db.query(
      `SELECT applications.id, users.email, users.name AS student_name, jobs.title, jobs.company_name
       FROM applications
       JOIN jobs ON applications.job_id = jobs.id
       JOIN users ON applications.student_id = users.id
       WHERE applications.id = ? AND jobs.recruiter_id = ?`,
      [applicationId, recruiterId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found or you do not have permission to update it' });
    }

    await db.query('UPDATE applications SET status = ? WHERE id = ?', [status, applicationId]);

    // Best-effort notification — fire-and-forget so a slow/failed email never blocks or fails the status update
    const { email, student_name, title, company_name } = rows[0];
    console.log(`Attempting status email to ${email}...`);
    sendStatusUpdateEmail(email, student_name, title, company_name, status)
      .then(() => console.log(`Status email sent to ${email}`))
      .catch(err => {
        console.error('Failed to send status update email:', err);
      });

    res.json({ message: 'Application status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// RECRUITER removes an application entirely
router.delete('/:id', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const applicationId = req.params.id;

    const [rows] = await db.query(
      `SELECT applications.id 
       FROM applications
       JOIN jobs ON applications.job_id = jobs.id
       WHERE applications.id = ? AND jobs.recruiter_id = ?`,
      [applicationId, recruiterId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found or you do not have permission to remove it' });
    }

    await db.query('DELETE FROM applications WHERE id = ?', [applicationId]);
    res.json({ message: 'Application removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;