# AcademyFlow

Academic MCQ platform with separate instructor and student flows, scheduled tests, email verification, and proctored timed exams.

## Assessment safeguards

- Students sign in with a one-time email code; signed sessions are bound to their own attempts and results.
- A mandatory readiness gate checks HTTPS/localhost, API health, camera, microphone, the local MediaPipe face model, exactly one visible face, fullscreen support, and explicit monitoring consent.
- Camera analysis happens in the browser. Video frames are not uploaded or recorded; only timestamped proctor events are saved.
- The API creates the attempt and owns its start/expiry timestamps. Browser-supplied scores and durations are ignored.
- Answers, navigation position, flags, and proctor events autosave. Refreshing or reconnecting resumes the same one-attempt session.
- Instructors can assign per-student extra time in 15-minute increments before an attempt starts.
- Students receive their score after submission, but the answer key remains locked until the assessment window closes.
- Correct answers and full submissions remain available to authenticated instructors.

Proctor flags are review signals, not automatic proof of misconduct. An instructor should review context and provide an accommodation path when camera, microphone, fullscreen, or timed conditions are not appropriate for a student.

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
| `npm test` | Isolated API integration tests (does not touch configured MongoDB or `server/data.json`) |

## Data Storage

Shared data (tests, submissions, students) is stored in `server/data.json` so all students and the instructor see the same data when using the same server.

Active attempts are stored alongside tests and submissions. Set `DATA_STORE=local` to force the JSON store for development/testing even when `MONGODB_URI` exists. Production deployments should use MongoDB and must set a non-default `ADMIN_PASSWORD`.

## Browser and deployment requirements

- Use HTTPS in production; browsers only expose camera/microphone APIs in a secure context.
- Set `ALLOWED_ORIGIN` to the exact frontend origin. Multiple origins can be comma-separated.
- The bundled Netlify configuration supplies CSP, anti-framing, content-type, referrer, and permissions-policy headers.
- The Render configuration uses `/api/health` for readiness checks.

## Sharing on a Network

To let students on other devices connect:

```bash
npm run dev:api
npm run dev:web -- --host
```

Share links using your machine's LAN IP, e.g. `http://192.168.1.5:5173/test/...`
