require('dotenv').config();

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Escape user-controlled text before putting it inside HTML emails
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Sends over HTTPS (port 443) via Brevo's API, not SMTP, so it works on hosts that block SMTP ports
async function sendEmail(toEmail, subject, html) {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Email is not configured: set BREVO_API_KEY and EMAIL_FROM');
  }

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: process.env.EMAIL_FROM_NAME || 'Launchpad', email: process.env.EMAIL_FROM },
      to: [{ email: toEmail }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email API error ${response.status}: ${detail}`);
  }
}

async function sendOtpEmail(toEmail, otp) {
  await sendEmail(
    toEmail,
    'Your Password Reset OTP',
    `<p>Your OTP is <b>${escapeHtml(otp)}</b>. It expires in 10 minutes.</p>`
  );
}

const STATUS_LABELS = {
  applied: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  selected: 'Selected',
};

async function sendStatusUpdateEmail(toEmail, studentName, jobTitle, companyName, status) {
  const label = STATUS_LABELS[status] || status;
  await sendEmail(
    toEmail,
    `Application Update: ${jobTitle} at ${companyName}`,
    `<p>Hi ${escapeHtml(studentName)},</p>
     <p>Your application for <b>${escapeHtml(jobTitle)}</b> at <b>${escapeHtml(companyName)}</b> has been updated to: <b>${escapeHtml(label)}</b>.</p>
     <p>Log in to Launchpad to view more details.</p>`
  );
}

module.exports = { sendOtpEmail, sendStatusUpdateEmail };