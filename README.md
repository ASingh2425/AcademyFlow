# AcademyFlow

Academic MCQ platform with separate instructor and student flows, scheduled tests, email verification, and proctored timed exams.

## Assessment Safeguards & Anti-Cheat

- **Identity Verification & Session Integrity:** Students sign in with a one-time email code. Sessions are strictly bound to their attempt and cannot be resumed on another device.
- **Hardware & Environment Readiness:** A mandatory readiness gate enforces checks on HTTPS, API health, camera, microphone, local MediaPipe face models, and explicit monitoring consent.
- **AI Gaze & Face Tracking:** The browser continuously tracks the candidate's face. The assessment requires exactly one face looking at the screen. Looking away or having multiple people in frame triggers an alert.
- **Object Detection (Phones):** The AI proctor utilizes a vision model (COCO-SSD via MediaPipe) to detect unauthorized devices (e.g., cell phones) in the camera frame.
- **Audio Monitoring:** The system continuously monitors the microphone's audio levels. Speaking aloud or significant background noise triggers an audio alert.
- **Anti-Photography measures:** 
  - An invisible Moiré pattern grid overlay is placed on the screen. If a student tries to photograph their screen, it significantly distorts the image.
  - A dynamic, moving watermark containing the candidate's name overlays the exam view to trace any leaked images.
- **Copy/Paste Prevention:** Text selection and the context menu are disabled globally during the exam to prevent copying the question or pasting answers.
- **Data Privacy:** All camera and audio analysis happens locally in the browser. Raw video and audio streams are *never* uploaded. Only timestamped proctor alerts are logged to the server.

Proctor flags are review signals, not automatic proof of misconduct. Instructors should review the context and provide accommodations when necessary.

## Coding Assessments

In addition to standard MCQs, AcademyFlow supports full-fledged coding tests:
- **Assessment Builder:** Instructors can add Coding Questions alongside MCQs, configure mark values, and provide detailed problem statements.
- **In-Browser IDE:** Candidates solve coding challenges using an integrated Monaco Editor (the same engine behind VS Code) with syntax highlighting and auto-completion.
- **Test Cases:** Instructors can define multiple test cases consisting of STDIN inputs and expected STDOUT outputs. Test cases can be marked as visible (sample cases) or hidden.
- **Auto-Grading:** Submissions are securely executed and evaluated on the backend using the Piston Execution Engine, ensuring accurate and automatic scoring against all test cases.

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
