# Launchpad: Job & Internship Management Portal

A full-stack web application that connects students with job and internship openings. Recruiters post and manage roles. Students build a profile, get a skill-match score for every opening, and track their applications through to a decision.

**Live demo:** https://launchpad-e0s7.onrender.com

> The backend runs on a free hosting tier and sleeps when idle. The first request after a quiet period can take up to a minute while the server wakes up.

<!--
DEMO ACCOUNTS (uncomment and fill in after creating them in production)

| Role | Email | Password |
|---|---|---|
| Student | student@example.com | ******** |
| Recruiter | recruiter@example.com | ******** |
-->

---

## Table of contents

- [Features](#features)
- [How the matching works](#how-the-matching-works)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Database design](#database-design)
- [API overview](#api-overview)
- [Security](#security)
- [Run it locally](#run-it-locally)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Design decisions](#design-decisions)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Features

### Students
- Register, log in, and build a profile: education, skills, certifications, preferred city, GitHub, resume PDF, and photo
- Browse jobs with search, job-type filter, minimum-CTC filter, and sorting by best match
- See a **match score** and the **missing skills** for every job
- View full job details in a modal, apply in one click, and track application status

### Recruiters
- Post, edit, and delete job listings: CTC range, deadline, required skills, eligibility
- View applicants per job, automatically **ranked by match score**
- Update application status (applied, under review, shortlisted, rejected, selected). Students are notified by email
- Per-job status breakdown and dashboard statistics

### Platform
- Welcome email on registration, and a password reset with a one-time code sent by email
- Branded HTML emails that share one layout
- Role-based access control (student and recruiter)
- Expired job postings are hidden from students automatically
- Responsive layout, loading skeletons, toast notifications, and confirmation dialogs

---

## How the matching works

Matching is plain, deterministic logic. It uses no machine learning, so every score can be explained.

| Field | Meaning |
|---|---|
| `match_score` | Percentage of a job's required skills that appear in the student's skills |
| `missing_skills` | Required skills the student lacks |
| `location_match` | `true` when the student's preferred city equals the job's location |

**Example:** a job requires `java, sql, react, docker` and the student lists `Java, SQL`. The score is 2 of 4, so **50%**, and the missing skills are `react` and `docker`.

Scores are computed on the server **at request time** and never stored. When a recruiter edits a job's required skills, every applicant's score updates automatically on the next view.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Axios, lucide-react |
| Backend | Node.js, Express 5 |
| Database | MySQL 8 (`mysql2` connection pool) |
| Auth | JWT, bcrypt, role-based middleware |
| File storage | Cloudinary (resume PDFs and photos) |
| Email | Brevo transactional email API |
| Security | `express-rate-limit`, CORS allow-list, input validation |
| Hosting | Render (API and static site), Aiven (MySQL) |

---

## Architecture

```
Browser (React single-page app)
   |  Axios attaches  Authorization: Bearer <JWT>
   v
Express API
   |-- CORS allow-list  ->  rate limiters  ->  verifyToken  ->  requireRole
   |-- route handlers  ->  parameterised SQL (mysql2 pool)  ->  MySQL
   |-- Cloudinary  (uploaded files; the database stores the URL)
   |-- Brevo API   (welcome, OTP, and status-update emails)
```

---

## Project structure

```
job-portal/
├── README.md
├── backend/
│   ├── server.js              App entry: env check, CORS, JSON parsing, route mounting
│   ├── schema.sql             Structure of the 5 tables
│   ├── .env.example           Template for every environment variable
│   ├── config/
│   │   ├── db.js              MySQL pool (port and TLS support for hosted databases)
│   │   ├── mailer.js          Brevo email sender and shared email template
│   │   ├── cloudinary.js      Cloudinary setup and buffer upload helper
│   │   ├── upload.js          Resume upload rules (PDF, 5 MB)
│   │   └── uploadPhoto.js     Photo upload rules (JPG/PNG, 2 MB)
│   ├── middleware/
│   │   └── authMiddleware.js  verifyToken, requireRole
│   └── routes/
│       ├── auth.js            Register, login, photo, delete account, password reset
│       ├── profile.js         Student profile and resume
│       ├── jobs.js            Job CRUD, browse with filters, match scores, recruiter stats
│       └── applications.js    Apply, status updates, applicants per job
└── frontend/
    ├── index.html
    ├── .env.example           VITE_API_URL
    └── src/
        ├── main.jsx, App.jsx  Entry point and routes
        ├── config.js          API base URL and file URL helper
        ├── api/axios.js       Axios instance with token interceptor
        ├── context/           AuthContext, ToastContext
        ├── components/        Header, Footer, ProtectedRoute, ConfirmModal, JobDetailsModal
        ├── pages/             Home, Contact, Login, Register, ForgotPassword,
        │                      StudentDashboard, RecruiterDashboard
        └── index.css          Design tokens and styles
```

---

## Database design

Five relational tables with foreign keys and cascading deletes.

| Table | Purpose |
|---|---|
| `users` | Accounts for both roles (`role` enum: student, recruiter) |
| `student_profiles` | One-to-one with a student user |
| `jobs` | Owned by a recruiter |
| `applications` | Links a student to a job, with `UNIQUE (job_id, student_id)` so nobody applies twice |
| `password_resets` | One-time codes with expiry and a used flag |

Deleting a user cascades to their profile, jobs, applications, and reset codes. Deleting a job removes its applications. The full structure is in [`backend/schema.sql`](backend/schema.sql). Recruiter analytics (applicants per status per job) use SQL `GROUP BY` aggregation.

---

## API overview

All routes are under `/api`. Routes marked 🔒 need a JWT.

### Auth
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/register` | Sends a welcome email |
| POST | `/auth/login` | Rate limited |
| POST | `/auth/forgot-password` | Emails a one-time code, rate limited |
| POST | `/auth/verify-otp` | Rate limited |
| POST | `/auth/reset-password` | Rate limited |
| POST | `/auth/upload-photo` 🔒 | JPG/PNG, 2 MB |
| DELETE | `/auth/remove-photo` 🔒 | |
| DELETE | `/auth/delete-account` 🔒 | Cascading delete |

### Profile
| Method | Endpoint |
|---|---|
| GET | `/profile/me` 🔒 |
| PUT | `/profile/me` 🔒 |
| POST | `/profile/upload-resume` 🔒 |
| DELETE | `/profile/remove-resume` 🔒 |

### Jobs
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/jobs` 🔒 | Search, filters, match scores, `?sort=match` |
| GET | `/jobs/:id` 🔒 | |
| POST | `/jobs` 🔒 | Recruiter |
| PUT | `/jobs/:id` 🔒 | Recruiter, owner only |
| DELETE | `/jobs/:id` 🔒 | Recruiter, owner only |
| GET | `/jobs/my-jobs` 🔒 | Recruiter, includes per-status counts |
| GET | `/jobs/my-stats` 🔒 | Recruiter |

### Applications
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/applications/:jobId` 🔒 | Student |
| GET | `/applications/my-applications` 🔒 | Student |
| GET | `/applications/my-stats` 🔒 | Student |
| GET | `/applications/job/:jobId` 🔒 | Recruiter, ranked by match score |
| PUT | `/applications/:id/status` 🔒 | Recruiter, emails the student |
| DELETE | `/applications/:id` 🔒 | Recruiter |

Write routes verify ownership in SQL (for example `WHERE id = ? AND recruiter_id = ?`), so a recruiter can only modify their own data.

---

## Security

- Passwords are hashed with bcrypt; sessions use signed JWTs that expire after 7 days
- The server refuses to start without a `JWT_SECRET`
- Role checks plus ownership checks in SQL on every write route
- All queries are parameterised, which prevents SQL injection
- Login attempts and one-time-code requests and checks are rate limited per IP
- One-time codes come from a cryptographically secure generator, expire after 10 minutes, and older codes are retired when a new one is requested
- CORS is limited to the configured frontend origin
- Database connections use TLS with certificate verification on hosted databases
- Uploads are restricted by file type and size
- User-supplied text is escaped before it goes into emails
- Secrets live in environment variables; only `.env.example` files are committed

---

## Run it locally

**Prerequisites:** Node.js 18 or newer, MySQL 8, and free accounts at Cloudinary (uploads) and Brevo (email).

```bash
git clone https://github.com/2305100-Vineet/launchpad-job-portal.git
cd launchpad-job-portal
```

**1. Database**

```bash
mysql -u root -p -e "CREATE DATABASE job_portal"
mysql -u root -p job_portal < backend/schema.sql
```

**2. Backend** (runs on port 5000)

```bash
cd backend
npm install
# copy .env.example to .env and fill in your values
npm run dev
```

**3. Frontend** (runs on port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000; set automatically by most hosts) |
| `FRONTEND_URL` | Allowed browser origin(s) for CORS, comma-separated, no trailing slash |
| `JWT_SECRET` | Secret used to sign tokens (required) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `DB_SSL`, `DB_SSL_CA` | Set `DB_SSL=true` for hosted databases that require TLS. `DB_SSL_CA` is the CA certificate on one line with literal `\n` between lines |
| `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Transactional email |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL, no trailing slash (default `http://localhost:5000`). Read at build time |

---

## Deployment

The live site uses three free services.

| Part | Service | Key settings |
|---|---|---|
| Database | Aiven MySQL | Schema imported from `backend/schema.sql`; TLS required |
| API | Render web service | Root directory `backend`, build `npm install`, start `npm start`, set `NODE_VERSION=22` and all backend variables |
| Frontend | Render static site | Root directory `frontend`, build `npm install && npm run build`, publish `dist`, set `VITE_API_URL` |

The static site also needs a **rewrite rule** from `/*` to `/index.html`. Without it, refreshing a client-side route such as `/student-dashboard` returns a 404.

After the frontend is deployed, set `FRONTEND_URL` on the API to the frontend's address so the browser is allowed to call it.

---

## Design decisions

- **MySQL, not a document store.** The data is relational: foreign keys, cascading deletes, a uniqueness constraint on applications, and SQL aggregation for recruiter analytics.
- **Rule-based matching, not machine learning.** Scores are explainable and testable.
- **Match scores are computed, not stored.** This keeps them correct whenever a job or profile changes.
- **Files live in object storage, the database stores the URL.** Hosting platforms with ephemeral disks lose local uploads.
- **Email over HTTPS instead of SMTP.** Many hosts block outbound SMTP ports.
- **Emails are sent without blocking the request.** A slow or failing email service never delays or breaks registration or a status update.

---

## Known limitations

- On free hosting tiers the first request after a period of inactivity can take up to a minute while the server wakes up
- The free database tier can be powered off automatically after a period of inactivity and must be restarted from the provider's console
- Emails come from a shared sending domain and may land in spam
- Replaced or removed files are not deleted from Cloudinary
- Rate limiting is stored in server memory, so it resets on restart
- The login token is stored in `localStorage`
- There are no automated tests yet
- The contact page is a simple mailto link

---

## Roadmap

- Automated tests for the matching logic and ownership checks
- Job details deep links and shareable URLs
- A normalised skills table to replace comma-separated skill lists
- Admin moderation tools

---

## Author

**Vineet** · [GitHub](https://github.com/2305100-Vineet)