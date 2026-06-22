export interface Question {
  id: string
  text: string
  options: [string, string, string, string]
  correctIndex: number
  marks?: number        // per-question weightage (default 1)
}

export interface Test {
  id: string
  code: string
  title: string
  description: string
  timeLimitMinutes: number
  scheduledStart: string
  scheduledEnd: string
  questions: Question[]
  passMark?: number     // pass threshold as percentage 0–100 (default 50)
}

export interface ProctorEvent {
  timestamp: string
  message: string
}

export interface Student {
  id: string
  fullName: string
  registrationNumber: string
  email: string
  verified: boolean
  createdAt?: string
  sessionToken?: string
  extraTimeMinutes?: number
}

export interface Submission {
  id: string
  testId: string
  testTitle: string
  studentId: string
  candidateName: string
  registrationNumber: string
  email: string
  answers: (number | null)[]
  correctAnswers?: number[] // returned by the API only after submission
  score: number
  totalQuestions: number
  totalMarks?: number   // sum of all question marks
  durationSeconds: number
  submittedAt: string
  proctorEvents: ProctorEvent[]
  active: boolean
}

export interface ExamAttempt {
  id: string
  testId: string
  studentId: string
  startedAt: string
  expiresAt: string
  answers: (number | null)[]
  flaggedQuestions: number[]
  currentIndex: number
  proctorEvents: ProctorEvent[]
  lastSavedAt: string
  monitoringConsentedAt: string
  status: 'active' | 'submitted'
}

export type AppView = 'student' | 'exam' | 'results' | 'admin' | 'builder'

export interface ExamSession {
  attemptId: string
  testId: string
  studentId: string
  candidateName: string
  registrationNumber: string
  email: string
  answers: (number | null)[]
  flaggedQuestions: number[]   // indices of flagged questions
  currentIndex: number
  startedAt: number
  expiresAt: number
  proctorEvents: ProctorEvent[]
}

export interface BuilderQuestion {
  id: string
  text: string
  options: [string, string, string, string]
  correctIndex: number | null
  marks: number   // default 1
}

export type ScheduleStatus = 'upcoming' | 'open' | 'closed'
