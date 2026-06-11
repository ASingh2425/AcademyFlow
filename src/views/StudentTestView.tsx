import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileQuestion,
  Loader2,
  LogOut,
  Play,
  Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../components/Modal'
import { useStudent } from '../context/StudentContext'
import { api } from '../lib/api'
import {
  formatScheduleRange,
  getScheduleMessage,
  getScheduleStatus,
} from '../lib/schedule'
import type { Submission, Test } from '../types'
import { StudentAuthView } from './StudentAuthView'

interface StudentTestViewProps {
  testId: string
  onStartTest: (test: Test) => void
  onViewResults: (submission: Submission, test: Test) => void
}

export function StudentTestView({ testId, onStartTest, onViewResults }: StudentTestViewProps) {
  const { student, logout } = useStudent()
  const [test, setTest] = useState<Test | null>(null)
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const t = await api.getTest(testId)
        if (cancelled) return
        setTest(t)
        if (student) {
          const subs = await api.getStudentSubmissions({ testId, studentId: student.id })
          if (!cancelled && subs.length > 0) setExistingSubmission(subs[0])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load test.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [testId, student])

  if (!student) {
    return <StudentAuthView onAuthenticated={() => {}} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !test) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
          Test Not Found
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {error || 'This test link is invalid. Please check with your instructor.'}
        </p>
      </div>
    )
  }

  const scheduleStatus = getScheduleStatus(test, now)
  const canStart = scheduleStatus === 'open' && !existingSubmission

  return (
    <div className="animate-fade-in mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Signed in as <strong className="text-slate-900 dark:text-white">{student.fullName}</strong>
          <span className="ml-2 font-mono text-xs">({student.registrationNumber})</span>
        </p>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{test.code}</span>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{test.title}</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-400">{test.description}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm">{test.timeLimitMinutes} min time limit</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <FileQuestion className="h-4 w-4 text-slate-400" />
            <span className="text-sm">{test.questions.length} questions</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-indigo-500" />
            Scheduled Window
          </div>
          <p className="mt-1 font-mono text-sm text-slate-600 dark:text-slate-400">
            {formatScheduleRange(test)}
          </p>
          <p
            className={`mt-2 text-sm ${
              scheduleStatus === 'open'
                ? 'text-emerald-600 dark:text-emerald-400'
                : scheduleStatus === 'upcoming'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-500 dark:text-red-400'
            }`}
          >
            {getScheduleMessage(scheduleStatus, test)}
          </p>
        </div>

        {existingSubmission ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">You have already completed this test.</p>
            </div>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
              Score: {existingSubmission.score}/{existingSubmission.totalQuestions} — only one attempt
              is permitted.
            </p>
            <button
              type="button"
              onClick={() => onViewResults(existingSubmission, test)}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              View Your Results
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => setConfirmOpen(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 py-3 font-medium text-white transition-colors duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {scheduleStatus === 'upcoming'
              ? 'Not Yet Available'
              : scheduleStatus === 'closed'
                ? 'Window Closed'
                : 'Start Test'}
          </button>
        )}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Begin Assessment">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
            <Shield className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Active proctoring is enabled. Tab switches and focus loss will be logged. You may only
              attempt this test once.
            </p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ready to begin <strong>{test.title}</strong>? The {test.timeLimitMinutes}-minute timer
            starts immediately.
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmOpen(false)
              onStartTest(test)
            }}
            className="w-full rounded-lg bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600"
          >
            Begin Now
          </button>
        </div>
      </Modal>
    </div>
  )
}
