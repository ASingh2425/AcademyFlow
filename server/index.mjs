import express from 'express'
import cors from 'cors'
import { readData, writeData, generateId } from './store.mjs'
import { sendVerificationEmail } from './email.mjs'

const app = express()
const PORT = process.env.API_PORT || 3001
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
]

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, same-origin)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const rateLimitMap = new Map() // ip -> { count, resetAt }
const RATE_LIMIT = 15          // max requests
const RATE_WINDOW = 60 * 1000  // per 60 seconds

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  const now = Date.now()
  let entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW }
    rateLimitMap.set(ip, entry)
  }
  entry.count++
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' })
  }
  next()
}

// ─── Input Sanitization ───────────────────────────────────────────────────────

function sanitizeString(val, maxLen = 512) {
  if (typeof val !== 'string') return ''
  return val.trim().slice(0, maxLen)
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

// Simple token store (in-memory; resets on server restart)
const adminTokens = new Set()

function generateAdminToken() {
  return `adm-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' })
  }
  next()
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' })
  }
  const token = generateAdminToken()
  adminTokens.add(token)
  res.json({ token })
})

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token']
  if (token) adminTokens.delete(token)
  res.json({ ok: true })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function findStudent(data, registrationNumber, email) {
  const reg = registrationNumber.trim().toLowerCase()
  const em = email.trim().toLowerCase()
  return data.students.find(
    (s) => s.registrationNumber.toLowerCase() === reg && s.email.toLowerCase() === em
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Public read (students need to fetch tests by ID)
app.get('/api/tests/:id', (req, res) => {
  const test = readData().tests.find((t) => t.id === req.params.id)
  if (!test) return res.status(404).json({ error: 'Test not found' })
  res.json(test)
})

// Admin-protected routes
app.get('/api/tests', requireAdmin, (_req, res) => {
  res.json(readData().tests)
})

app.post('/api/tests', requireAdmin, (req, res) => {
  const data = readData()
  const test = { ...req.body, id: req.body.id || generateId('test') }
  // Sanitize test fields
  test.title = sanitizeString(test.title, 200)
  test.description = sanitizeString(test.description, 2000)
  test.code = sanitizeString(test.code, 50)
  const idx = data.tests.findIndex((t) => t.id === test.id)
  if (idx >= 0) data.tests[idx] = test
  else data.tests.push(test)
  writeData(data)
  res.json(test)
})

app.delete('/api/tests/:id', requireAdmin, (req, res) => {
  const data = readData()
  data.tests = data.tests.filter((t) => t.id !== req.params.id)
  writeData(data)
  res.json({ ok: true })
})

// ─── Submissions ──────────────────────────────────────────────────────────────

app.get('/api/submissions', requireAdmin, (req, res) => {
  const data = readData()
  const { testId, studentId } = req.query
  let subs = data.submissions
  if (testId) subs = subs.filter((s) => s.testId === testId)
  if (studentId) subs = subs.filter((s) => s.studentId === studentId)
  res.json(subs)
})

// Student checks their own submissions — no admin token needed but requires studentId match
app.get('/api/submissions/student', (req, res) => {
  const data = readData()
  const { testId, studentId } = req.query
  if (!studentId) return res.status(400).json({ error: 'studentId required' })
  let subs = data.submissions.filter((s) => s.studentId === studentId)
  if (testId) subs = subs.filter((s) => s.testId === testId)
  res.json(subs)
})

app.post('/api/submissions', (req, res) => {
  const data = readData()
  const { testId, studentId } = req.body

  const existing = data.submissions.find(
    (s) => s.testId === testId && s.studentId === studentId
  )
  if (existing) {
    return res.status(409).json({ error: 'You have already attempted this test.' })
  }

  const submission = {
    ...req.body,
    id: req.body.id || generateId('sub'),
    submittedAt: req.body.submittedAt || new Date().toISOString(),
    active: true,
  }
  data.submissions.push(submission)
  writeData(data)
  res.json(submission)
})

app.delete('/api/submissions/:id', requireAdmin, (req, res) => {
  const data = readData()
  const exists = data.submissions.find((s) => s.id === req.params.id)
  if (!exists) return res.status(404).json({ error: 'Submission not found' })
  data.submissions = data.submissions.filter((s) => s.id !== req.params.id)
  writeData(data)
  res.json({ ok: true })
})

// ─── Students ─────────────────────────────────────────────────────────────────

app.get('/api/students', requireAdmin, (_req, res) => {
  const data = readData()
  // Never expose passwords or verification codes
  const safe = data.students.map(({ id, fullName, registrationNumber, email, verified, createdAt }) => ({
    id, fullName, registrationNumber, email, verified, createdAt,
  }))
  res.json(safe)
})

app.delete('/api/students/:id', requireAdmin, (req, res) => {
  const data = readData()
  const exists = data.students.find((s) => s.id === req.params.id)
  if (!exists) return res.status(404).json({ error: 'Student not found' })
  data.students = data.students.filter((s) => s.id !== req.params.id)
  // Also remove their submissions and pending verifications
  data.submissions = data.submissions.filter((s) => s.studentId !== req.params.id)
  data.pendingVerifications = data.pendingVerifications.filter((p) => p.studentId !== req.params.id)
  writeData(data)
  res.json({ ok: true })
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/signup', rateLimit, async (req, res) => {
  const fullName = sanitizeString(req.body.fullName, 100)
  const registrationNumber = sanitizeString(req.body.registrationNumber, 50)
  const email = sanitizeString(req.body.email, 200)

  if (!fullName || !registrationNumber || !email) {
    return res.status(400).json({ error: 'Full name, registration number, and email are required.' })
  }

  const data = readData()
  const reg = registrationNumber.trim()
  const em = email.trim().toLowerCase()

  const regTaken = data.students.find(
    (s) => s.registrationNumber.toLowerCase() === reg.toLowerCase()
  )
  if (regTaken && regTaken.email.toLowerCase() !== em) {
    return res.status(409).json({ error: 'Registration number already in use.' })
  }

  const emailTaken = data.students.find((s) => s.email.toLowerCase() === em)
  if (emailTaken && emailTaken.registrationNumber.toLowerCase() !== reg.toLowerCase()) {
    return res.status(409).json({ error: 'Email already registered with a different registration number.' })
  }

  let student = findStudent(data, reg, em)
  if (!student) {
    student = {
      id: generateId('student'),
      fullName,
      registrationNumber: reg,
      email: em,
      verified: false,
      createdAt: new Date().toISOString(),
    }
    data.students.push(student)
  } else {
    student.fullName = fullName
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  data.pendingVerifications = data.pendingVerifications.filter((p) => p.email !== em)
  data.pendingVerifications.push({ email: em, code, expiresAt, studentId: student.id })

  writeData(data)

  const emailResult = await sendVerificationEmail(em, code)
  res.json({
    message: emailResult.sent
      ? 'Verification code sent to your email.'
      : 'SMTP not configured — use the code shown below (dev mode).',
    studentId: student.id,
    requiresVerification: !student.verified,
    devCode: emailResult.devCode,
  })
})

app.post('/api/auth/verify', rateLimit, (req, res) => {
  const email = sanitizeString(req.body.email, 200)
  const code = sanitizeString(req.body.code, 10)

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' })
  }

  const data = readData()
  const em = email.trim().toLowerCase()
  const pending = data.pendingVerifications.find((p) => p.email === em)

  if (!pending) {
    return res.status(400).json({ error: 'No pending verification. Please sign up again.' })
  }
  if (new Date(pending.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Verification code expired. Request a new one.' })
  }
  if (pending.code !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code.' })
  }

  const student = data.students.find((s) => s.id === pending.studentId)
  if (!student) return res.status(404).json({ error: 'Student not found.' })

  student.verified = true
  data.pendingVerifications = data.pendingVerifications.filter((p) => p.email !== em)
  writeData(data)

  res.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      registrationNumber: student.registrationNumber,
      email: student.email,
      verified: true,
    },
  })
})

app.post('/api/auth/resend', rateLimit, async (req, res) => {
  const registrationNumber = sanitizeString(req.body.registrationNumber, 50)
  const email = sanitizeString(req.body.email, 200)
  const data = readData()
  const student = findStudent(data, registrationNumber, email)

  if (!student) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' })
  }

  const code = generateCode()
  const em = student.email.toLowerCase()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  data.pendingVerifications = data.pendingVerifications.filter((p) => p.email !== em)
  data.pendingVerifications.push({ email: em, code, expiresAt, studentId: student.id })
  writeData(data)

  const emailResult = await sendVerificationEmail(em, code)
  res.json({
    message: emailResult.sent ? 'New code sent.' : 'SMTP not configured — dev code below.',
    devCode: emailResult.devCode,
  })
})

app.post('/api/auth/login', rateLimit, async (req, res) => {
  const registrationNumber = sanitizeString(req.body.registrationNumber, 50)
  const email = sanitizeString(req.body.email, 200)
  const data = readData()
  const student = findStudent(data, registrationNumber, email)

  if (!student) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' })
  }
  if (!student.verified) {
    const code = generateCode()
    const em = student.email.toLowerCase()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    data.pendingVerifications = data.pendingVerifications.filter((p) => p.email !== em)
    data.pendingVerifications.push({ email: em, code, expiresAt, studentId: student.id })
    writeData(data)
    const emailResult = await sendVerificationEmail(em, code)
    return res.json({
      requiresVerification: true,
      message: 'Email not verified. A new code has been sent.',
      devCode: emailResult.devCode,
    })
  }

  res.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      registrationNumber: student.registrationNumber,
      email: student.email,
      verified: true,
    },
  })
})

app.listen(PORT, () => {
  console.log(`AcademyFlow API running on http://localhost:${PORT}`)
  console.log(`Admin password: ${ADMIN_PASSWORD === 'admin1234' ? '⚠️  Using default password! Set ADMIN_PASSWORD in .env' : '✓ Custom password set'}`)
})
