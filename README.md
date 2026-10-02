\# Launchpad: Job \& Internship Management Portal



A full-stack web application that connects students with job and internship openings. Recruiters post and manage roles; students build a profile, get a skill-match score for every opening, and track their applications through to a decision.



\*\*Live demo:\*\* \_<added after deployment>\_



\## Screenshots



| Landing page | Student: job matching |

|---|---|

| !\[Landing page](docs/screenshots/landing.png) | !\[Job matching](docs/screenshots/student-jobs.png) |



| Recruiter: applicants | Job details |

|---|---|

| !\[Applicants](docs/screenshots/recruiter-applicants.png) | !\[Job details](docs/screenshots/job-details.png) |



\## Features



\*\*Students\*\*

\- Register, log in, and build a profile (education, skills, certifications, preferred city, GitHub, resume PDF, photo)

\- Browse jobs with search, job-type filter, minimum-CTC filter, and sorting by best match

\- See a \*\*match score\*\* and the \*\*missing skills\*\* for every job

\- View full job details in a modal, apply in one click, and track application status



\*\*Recruiters\*\*

\- Post, edit, and delete job listings (CTC range, deadline, required skills, eligibility)

\- View applicants per job, automatically \*\*ranked by match score\*\*

\- Update application status (applied, under review, shortlisted, rejected, selected). Students are notified by email.

\- Per-job status breakdown and dashboard statistics



\*\*Platform\*\*

\- Password reset with a one-time code sent by email

\- Role-based access control (student and recruiter)

\- Expired job postings are hidden from students automatically

\- Responsive layout, loading skeletons, and toast notifications



\## How the matching works



Matching is plain, deterministic logic. It uses no machine learning.



\- `match\_score` is the percentage of a job's required skills that appear in the student's skills

\- `missing\_skills` lists the required skills the student lacks

\- `location\_match` is true when the student's preferred city equals the job's location



Scores are computed on the server \*\*at request time\*\* and never stored. When a recruiter edits a job's required skills, every applicant's score updates automatically on the next view.



\## Tech stack



| Layer | Technology |

|---|---|

| Backend | Node.js, Express |

| Database | MySQL (`mysql2`) |

| Auth | JWT, bcrypt, role-based middleware |

| Frontend | React (Vite), React Router, Axios |

| File storage | Cloudinary (resume PDFs and photos) |

| Email | Brevo transactional email API |

| Security | `express-rate-limit`, CORS allow-list, input validation |



\## Database design



Five relational tables with foreign keys and cascading deletes:



\- `users`: accounts for both roles (`role` enum: student, recruiter)

\- `student\_profiles`: one-to-one with a student user

\- `jobs`: owned by a recruiter

\- `applications`: links a student to a job, with a `UNIQUE (job\_id, student\_id)` constraint so nobody applies twice

\- `password\_resets`: one-time codes with expiry and a used flag



The full structure is in \[`backend/schema.sql`](backend/schema.sql). Recruiter analytics (applicants per status per job) use SQL `GROUP BY` aggregation.



\## API overview



All routes are under `/api`. Routes marked 🔒 need a JWT.



| Area | Endpoints |

|---|---|

| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/verify-otp`, `POST /auth/reset-password`, 🔒 `POST /auth/upload-photo`, 🔒 `DELETE /auth/remove-photo`, 🔒 `DELETE /auth/delete-account` |

| Profile | 🔒 `GET /profile/me`, 🔒 `PUT /profile/me`, 🔒 `POST /profile/upload-resume`, 🔒 `DELETE /profile/remove-resume` |

| Jobs | 🔒 `GET /jobs` (search, filters, match scores), 🔒 `GET /jobs/:id`, 🔒 `POST /jobs`, 🔒 `PUT /jobs/:id`, 🔒 `DELETE /jobs/:id`, 🔒 `GET /jobs/my-jobs`, 🔒 `GET /jobs/my-stats` |

| Applications | 🔒 `POST /applications/:jobId`, 🔒 `GET /applications/my-applications`, 🔒 `GET /applications/my-stats`, 🔒 `GET /applications/job/:jobId`, 🔒 `PUT /applications/:id/status`, 🔒 `DELETE /applications/:id` |



Write routes verify ownership in SQL (for example `WHERE id = ? AND recruiter\_id = ?`), so a recruiter can only modify their own data.



\## Security notes



\- Passwords are hashed with bcrypt; sessions use signed JWTs

\- Login attempts and one-time-code requests and checks are rate limited per IP

\- One-time codes use a cryptographically secure generator, expire after 10 minutes, and older codes are retired when a new one is requested

\- CORS is limited to the configured frontend origin

\- User-supplied text is escaped before it goes into emails

\- Secrets live in environment variables; only `.env.example` files are committed



\## Run it locally



\*\*Prerequisites:\*\* Node.js 18+, MySQL 8, and free accounts at Cloudinary (uploads) and Brevo (email).



```bash

git clone https://github.com/2305100-Vineet/launchpad-job-portal.git

cd launchpad-job-portal

```



\*\*Database\*\*



```bash

mysql -u root -p -e "CREATE DATABASE job\_portal"

mysql -u root -p job\_portal < backend/schema.sql

```



\*\*Backend\*\* (runs on port 5000)



```bash

cd backend

npm install

\# copy .env.example to .env and fill in your values (see the table below)

npm run dev

```



\*\*Frontend\*\* (runs on port 5173)



```bash

cd frontend

npm install

npm run dev

```



\### Environment variables (`backend/.env`)



| Variable | Purpose |

|---|---|

| `PORT` | API port (default 5000) |

| `FRONTEND\_URL` | Allowed browser origin(s) for CORS, comma-separated |

| `JWT\_SECRET` | Secret used to sign tokens (required) |

| `DB\_HOST`, `DB\_PORT`, `DB\_USER`, `DB\_PASSWORD`, `DB\_NAME` | MySQL connection |

| `DB\_SSL`, `DB\_SSL\_CA` | Set for hosted databases that require TLS |

| `BREVO\_API\_KEY`, `EMAIL\_FROM`, `EMAIL\_FROM\_NAME` | Transactional email |

| `CLOUDINARY\_CLOUD\_NAME`, `CLOUDINARY\_API\_KEY`, `CLOUDINARY\_API\_SECRET` | File uploads |



The frontend reads one optional variable, `VITE\_API\_URL` (defaults to `http://localhost:5000`).



\## Design decisions



\- \*\*MySQL, not a document store.\*\* The data is relational: foreign keys, cascading deletes, a uniqueness constraint on applications, and SQL aggregation for recruiter analytics.

\- \*\*Match scores are computed, not stored.\*\* This keeps them correct when a job or profile changes.

\- \*\*Files live in object storage, the database stores the URL.\*\* Hosting platforms with ephemeral disks lose local uploads.

\- \*\*Email over HTTPS instead of SMTP.\*\* Many hosts block outbound SMTP ports.



\## Known limitations



\- On free hosting tiers the first request after a period of inactivity can take up to a minute while the server wakes up

\- Verification emails come from a shared sending domain and may land in spam

\- Replaced or removed files are not deleted from Cloudinary

\- The contact page is informational only



\## Roadmap



\- Job details deep links and shareable URLs

\- Automated tests for the matching logic and ownership checks

\- Admin moderation tools



\## Author



\*\*Vineet\*\* · \[GitHub](https://github.com/2305100-Vineet)

