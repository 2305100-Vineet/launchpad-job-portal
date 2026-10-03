require('dotenv').config();

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Link target for buttons: the first origin listed in FRONTEND_URL, without a trailing slash
const SITE_URL = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')[0]
  .trim()
  .replace(/\/+$/, '');

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

// ---- Shared layout: every email uses this, so they all look consistent ----
// Inline styles and tables on purpose: email clients ignore most modern CSS.
// bodyHtml must already be escaped by the caller.
function layout({ preheader, heading, bodyHtml, buttonLabel, buttonPath }) {
  const button = buttonLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
         <tr><td style="background:#e8643c;border-radius:8px;">
           <a href="${escapeHtml(SITE_URL + (buttonPath || ''))}"
              style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">
             ${escapeHtml(buttonLabel)}
           </a>
         </td></tr>
       </table>`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || '')}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#14213d;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">
          Launchpad
        </td></tr>
        <tr><td style="padding:28px;color:#1f2937;font-size:15px;line-height:1.6;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#14213d;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          ${button}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;">
          You are receiving this email because of activity on your Launchpad account.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- Welcome email (sent after registration) ----
async function sendWelcomeEmail(toEmail, name, role) {
  const isStudent = role === 'student';
  const intro = isStudent
    ? 'Your account is ready. Complete your profile with your skills, add your resume, and Launchpad will show you how well each job matches you and which skills you are missing.'
    : 'Your account is ready. Post your first job and Launchpad will rank every applicant by how well their skills match, so you know who to talk to first.';

  await sendEmail(
    toEmail,
    'Welcome to Launchpad',
    layout({
      preheader: 'Your Launchpad account is ready.',
      heading: `Welcome, ${name}!`,
      bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(intro)}</p>`,
      buttonLabel: isStudent ? 'Complete your profile' : 'Post your first job',
      buttonPath: '/login',
    })
  );
}

// ---- Password reset OTP ----
async function sendOtpEmail(toEmail, otp) {
  await sendEmail(
    toEmail,
    'Your Launchpad password reset code',
    layout({
      preheader: 'Your one-time code expires in 10 minutes.',
      heading: 'Reset your password',
      bodyHtml: `
        <p style="margin:0 0 16px;">Use this one-time code to reset your password. It expires in 10 minutes.</p>
        <div style="background:#f4f5f8;border-radius:8px;padding:16px;text-align:center;font-size:30px;font-weight:700;letter-spacing:8px;color:#14213d;">
          ${escapeHtml(otp)}
        </div>
        <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>`,
    })
  );
}

// ---- Application status update ----
const STATUS_LABELS = {
  applied: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  selected: 'Selected',
};

// badge colours and a friendly one-line message for each status
const STATUS_STYLE = {
  applied: { fg: '#1d4ed8', bg: '#dbeafe', msg: 'Your application has been received.' },
  under_review: { fg: '#b45309', bg: '#fef3c7', msg: 'The recruiter is now reviewing your application.' },
  shortlisted: { fg: '#6d28d9', bg: '#ede9fe', msg: 'Great news, you have been shortlisted.' },
  rejected: { fg: '#b91c1c', bg: '#fee2e2', msg: 'The recruiter has decided not to move forward this time. Keep applying, the right fit is out there.' },
  selected: { fg: '#15803d', bg: '#dcfce7', msg: 'Congratulations, you have been selected!' },
};

async function sendStatusUpdateEmail(toEmail, studentName, jobTitle, companyName, status) {
  const label = STATUS_LABELS[status] || status;
  const style = STATUS_STYLE[status] || { fg: '#374151', bg: '#e5e7eb', msg: '' };

  await sendEmail(
    toEmail,
    `Application update: ${jobTitle} at ${companyName}`,
    layout({
      preheader: `Your application is now: ${label}`,
      heading: 'Your application was updated',
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(studentName)},</p>
        <p style="margin:0 0 16px;">Your application for <b>${escapeHtml(jobTitle)}</b> at <b>${escapeHtml(companyName)}</b> has a new status:</p>
        <p style="margin:0 0 16px;">
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${style.bg};color:${style.fg};font-weight:700;font-size:14px;">
            ${escapeHtml(label)}
          </span>
        </p>
        <p style="margin:0;">${escapeHtml(style.msg)}</p>`,
      buttonLabel: 'View my applications',
      buttonPath: '/login',
    })
  );
}

module.exports = { sendWelcomeEmail, sendOtpEmail, sendStatusUpdateEmail };