# AcademyFlow

Academic MCQ platform with separate instructor and student flows, scheduled tests, email verification, and proctored timed exams.

## Roles & URLs

| URL | Who | Purpose |
|-----|-----|---------|
| `/admin` | Instructor only | Create tests, copy share links, view scores |
| `/test/:testId` | Students | Sign up, verify email, take scheduled test |
| `/` | Students | Landing page — explains they need a test link |

Students never see the Creator Dashboard. Instructors use `/admin` directly (bookmark it).

## Quick Start

```bash
npm install
npm run dev
```

This starts **both** the API server (`localhost:3001`) and the web app (`localhost:5173`).

### Workflow

1. Open **http://localhost:5173/admin**
2. Click **New Assessment** — set title, schedule window, questions, time limit
3. Click **Copy Link** on the published test
4. Share that link with students (e.g. `http://localhost:5173/test/abc-123`)
5. Students sign up with registration number + email, verify via code
6. Students can start only during the scheduled window, once
7. Both student and instructor can view scores

## Email Verification

Verification codes are sent via SMTP. Copy `.env.example` to `.env` and configure your mail provider.

**Without SMTP (dev mode):** codes are printed in the API terminal and shown on-screen to the student.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + frontend together |
| `npm run dev:web` | Frontend only |
| `npm run dev:api` | API only |
| `npm run build` | Production frontend build |

## Data Storage

Shared data (tests, submissions, students) is stored in `server/data.json` so all students and the instructor see the same data when using the same server.

## Sharing on a Network

To let students on other devices connect:

```bash
npm run dev:api
npm run dev:web -- --host
```

Share links using your machine's LAN IP, e.g. `http://192.168.1.5:5173/test/...`
