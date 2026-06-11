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
  score: number
  totalQuestions: number
  totalMarks?: number   // sum of all question marks
  durationSeconds: number
  submittedAt: string
  proctorEvents: ProctorEvent[]
  active: boolean
}

export type AppView = 'student' | 'exam' | 'results' | 'admin' | 'builder'

export interface ExamSession {
  testId: string
  studentId: string
  candidateName: string
  registrationNumber: string
  email: string
  answers: (number | null)[]
  flaggedQuestions: number[]   // indices of flagged questions
  currentIndex: number
  startedAt: number
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
