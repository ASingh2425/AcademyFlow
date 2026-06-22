import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Send, Shield } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CodeEditor } from '../components/CodeEditor'
import { Modal } from '../components/Modal'
import { CameraProctor } from '../components/CameraProctor'
import { AIProctorMonitor } from '../components/AIProctorMonitor'
import { AntiCameraOverlay } from '../components/AntiCameraOverlay'
import { useProctoring } from '../hooks/useProctoring'
import { api } from '../lib/api'
import { formatTimeRemaining } from '../lib/scoring'
import type { Dispatch, SetStateAction } from 'react'
import type { ExamSession, ProctorEvent, Test } from '../types'

const LABELS = ['A', 'B', 'C', 'D'] as const

interface ExamViewProps {
  test: Test
  session: ExamSession
  onUpdateSession: Dispatch<SetStateAction<ExamSession | null>>
  onSubmit: (session: ExamSession) => void
}

export function ExamView({ test, session, onUpdateSession, onSubmit }: ExamViewProps) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'offline'>('saved')
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)
  
  const latestSessionRef = useRef(session)
  latestSessionRef.current = session
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const [lockoutCount, setLockoutCount] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)

  useEffect(() => {
    if (!lockoutUntil) return
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))
      setLockoutTimeLeft(left)
      if (left <= 0) {
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  const enterFullscreen = () => {
    try {
      const doc = document.documentElement
      if (doc.requestFullscreen) {
        doc.requestFullscreen()
      } else if ((doc as any).webkitRequestFullscreen) {
        ;(doc as any).webkitRequestFullscreen()
      }
    } catch (e) {
      console.warn('Failed to enter fullscreen mode:', e)
    }
  }

  const addProctorEvent = useCallback(
    (event: ProctorEvent) => {
      onUpdateSession((prev) =>
        prev ? { ...prev, proctorEvents: [...prev.proctorEvents, event] } : prev
      )
    },
    [onUpdateSession]
  )

  const handleVideoRef = useCallback((ref: React.RefObject<HTMLVideoElement | null>) => {
    videoRef.current = ref.current
  }, [])

  const handleMediaEvent = useCallback((message: string) => {
    addProctorEvent({
      timestamp: new Date().toISOString(),
      message: `Media Proctor: ${message}`,
    })
  }, [addProctorEvent])

  const submittedRef = useRef(false)
  const submitOnce = useCallback((currentSession: ExamSession) => {
    if (submittedRef.current) return
    submittedRef.current = true
    onSubmit(currentSession)
  }, [onSubmit])

  const handleLockout = useCallback((reason: string) => {
    setLockoutUntil((current) => {
      if (current && Date.now() < current) return current
      
      let nextCount = 0
      setLockoutCount((prev) => {
        nextCount = prev + 1
        if (nextCount >= 3) {
          addProctorEvent({
            timestamp: new Date().toISOString(),
            message: `AUTO-SUBMIT: Multiple suspensions limit reached (3 infractions). Last trigger: ${reason}`,
          })
          submitOnce(latestSessionRef.current)
        } else {
          addProctorEvent({
            timestamp: new Date().toISOString(),
            message: `SUSPENSION ACTIVE: 3-minute cooldown (Infraction #${nextCount}). Trigger: ${reason}`,
          })
        }
        return nextCount
      })

      if (nextCount >= 3) return null
      return Date.now() + 180 * 1000
    })
  }, [addProctorEvent, submitOnce])

  useProctoring(true, addProctorEvent, handleLockout)

  useEffect(() => {
    submittedRef.current = false
  }, [session.startedAt])

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0 && !submittedRef.current) {
        submitOnce(latestSessionRef.current)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.expiresAt, submitOnce])

  useEffect(() => {
    if (submittedRef.current) return
    setSaveStatus('saving')
    const timeout = window.setTimeout(() => {
      api.saveAttempt(session)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('offline'))
    }, 750)
    return () => window.clearTimeout(timeout)
  }, [session])

  const currentQ = test.questions[session.currentIndex]
  const selected = session.answers[session.currentIndex]
  const isFlagged = session.flaggedQuestions.includes(session.currentIndex)

  const setAnswer = (val: any) => {
    onUpdateSession((prev) => {
      if (!prev) return prev
      const answers = [...prev.answers]
      answers[prev.currentIndex] = val
      return { ...prev, answers }
    })
  }

  const toggleFlag = () => {
    onUpdateSession((prev) => {
      if (!prev) return prev
      const flagged = prev.flaggedQuestions.includes(prev.currentIndex)
        ? prev.flaggedQuestions.filter((i) => i !== prev.currentIndex)
        : [...prev.flaggedQuestions, prev.currentIndex]
      return { ...prev, flaggedQuestions: flagged }
    })
  }

  const goTo = (index: number) => {
    onUpdateSession((prev) => (prev ? { ...prev, currentIndex: index } : prev))
  }

  const unansweredCount = session.answers.filter((a) => a === null).length

  const timerClass =
    remaining < 60
      ? 'timer-danger font-mono text-2xl font-bold'
      : remaining < 180
        ? 'timer-amber font-mono text-2xl font-bold'
        : 'font-mono text-2xl font-bold text-slate-900 dark:text-white'

  return (
    <div className="exam-mode animate-fade-in mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 lg:flex-row lg:px-6">
      <AntiCameraOverlay email={session.candidateName} active={true} />
      
      {lockoutUntil && Date.now() < lockoutUntil ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-lg px-4 text-center">
          <div className="max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-8 shadow-2xl shadow-red-500/25">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 animate-bounce" />
            <h3 className="mt-4 text-xl font-bold text-white">Assessment Suspended</h3>
            <p className="mt-2 text-sm text-slate-400">
              Your test session has been suspended due to tab focus loss, device disconnect, or a fullscreen violation.
            </p>
            <div className="my-6 rounded-xl bg-slate-800/80 p-4 border border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Cooldown Period</p>
              <p className="mt-1 font-mono text-3xl font-bold text-red-500">
                {Math.floor(lockoutTimeLeft / 60)}:{(lockoutTimeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <p className="text-sm font-semibold text-amber-500">
              Suspensions: {lockoutCount} / 2 warnings
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              *A 3rd infraction will result in immediate, automated test submission.
            </p>
            <button
              type="button"
              disabled={lockoutTimeLeft > 0}
              onClick={() => {
                setLockoutUntil(null)
                enterFullscreen()
              }}
              className="mt-6 w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:opacity-50 focus:outline-none"
            >
              {lockoutTimeLeft > 0 ? 'Cooldown Active' : 'Resume Assessment'}
            </button>
          </div>
        </div>
      ) : (
        !isFullscreen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md px-4 text-center">
            <div className="max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-8 shadow-2xl shadow-red-500/10">
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 animate-bounce" />
              <h3 className="mt-4 text-xl font-bold text-white">Fullscreen Required</h3>
              <p className="mt-2 text-sm text-slate-400">
                To take this exam, your window must be in fullscreen mode.
              </p>
              <button
                type="button"
                onClick={enterFullscreen}
                className="mt-6 w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-600 focus:outline-none"
              >
                Enter Fullscreen Mode
              </button>
            </div>
          </div>
        )
      )}
      
      {/* Main question area */}
      <div className="flex-1">
        {/* Top bar — always visible */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{test.code}</p>
            <h2 className="font-semibold text-slate-900 dark:text-white">{test.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Candidate: {session.candidateName}
            </p>
            <p aria-live="polite" className={`text-xs ${saveStatus === 'offline' ? 'text-red-500' : 'text-slate-400'}`}>
              {saveStatus === 'saving' ? 'Saving progress…' : saveStatus === 'saved' ? 'Progress saved' : 'Offline — retrying on next change'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Time Remaining
            </p>
            <p className={timerClass}>{formatTimeRemaining(remaining)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
              Question {session.currentIndex + 1} of {test.questions.length}
            </p>
            <button
              type="button"
              onClick={toggleFlag}
              title={isFlagged ? 'Remove flag' : 'Flag for review'}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                isFlagged
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              <Flag className={`h-3.5 w-3.5 ${isFlagged ? 'fill-amber-500' : ''}`} />
              {isFlagged ? 'Flagged' : 'Flag for Review'}
            </button>
          </div>

          <h3 className="mt-4 text-xl font-semibold leading-relaxed text-slate-900 dark:text-white sm:text-2xl">
            {currentQ.text}
          </h3>
          {currentQ.marks && currentQ.marks > 1 && (
            <p className="mt-1 text-xs text-indigo-500">
              [{currentQ.marks} marks]
            </p>
          )}

          {currentQ.type === 'coding' ? (
            <div className="mt-8">
              <CodeEditor
                code={typeof selected === 'object' && selected !== null ? selected.code : (currentQ.starterCode?.[currentQ.allowedLanguages?.[0] || 'python'] || '')}
                language={typeof selected === 'object' && selected !== null ? selected.language : (currentQ.allowedLanguages?.[0] || 'python')}
                onChange={(code) => {
                  const lang = typeof selected === 'object' && selected !== null ? selected.language : (currentQ.allowedLanguages?.[0] || 'python')
                  setAnswer({ code: code || '', language: lang })
                }}
                testCases={currentQ.testCases || []}
              />
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {(currentQ.options || []).map((opt, i) => {
                const isSelected = selected === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswer(i)}
                    className={`flex w-full items-start gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {LABELS[i]}
                    </span>
                    <span className="pt-1 text-slate-800 dark:text-slate-200">{opt}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              disabled={session.currentIndex === 0}
              onClick={() => goTo(session.currentIndex - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            {session.currentIndex < test.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => goTo(session.currentIndex + 1)}
                className="flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" />
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-full space-y-4 lg:w-72">
        {/* Camera Proctoring */}
        <div className="rounded-xl border border-indigo-500 bg-gradient-to-br from-indigo-50/50 to-indigo-50/30 p-4 dark:border-indigo-400 dark:from-indigo-950/40 dark:to-indigo-950/20">
          <CameraProctor active onVideoRef={handleVideoRef} onMediaEvent={handleMediaEvent} />
        </div>

        {/* AI Proctoring Monitor */}
        <div className="rounded-xl border border-violet-500 bg-gradient-to-br from-violet-50/50 to-violet-50/30 p-4 dark:border-violet-400 dark:from-violet-950/40 dark:to-violet-950/20">
          <AIProctorMonitor
            videoRef={videoRef}
            active={true}
            onProctorEvent={addProctorEvent}
          />
        </div>

        {/* Session integrity */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Session Integrity Status
            </h4>
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              session.proctorEvents.length === 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            {session.proctorEvents.length === 0 ? (
              'Pristine — no flags recorded'
            ) : (
              <span className="flex items-center gap-1">
                <Flag className="h-3.5 w-3.5" />
                {session.proctorEvents.length} event(s) flagged
              </span>
            )}
          </div>
          {session.proctorEvents.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto">
              {session.proctorEvents.map((ev, i) => (
                <p
                  key={i}
                  className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {ev.message}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Jump map */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-3 font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Jump Map
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {test.questions.map((_, i) => {
              const answered = session.answers[i] !== null
              const isCurrent = session.currentIndex === i
              const flagged = session.flaggedQuestions.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  title={flagged ? 'Flagged for review' : undefined}
                  className={`relative aspect-square rounded-lg font-mono text-sm font-medium transition-all duration-200 ${
                    isCurrent
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : answered
                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        : 'border border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                  }`}
                >
                  {i + 1}
                  {flagged && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[8px] text-white">
                      ●
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-slate-200 dark:bg-slate-700" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded border border-slate-300 dark:border-slate-600" /> Skipped
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Flagged
            </span>
          </div>
        </div>

        {/* Submit early */}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
        >
          <Send className="h-4 w-4" />
          Submit Early
        </button>
      </aside>

      {/* Submit confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Submission"
      >
        <div className="space-y-4">
          {unansweredCount > 0 && (
            <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount > 1 ? 's' : ''}.
                These will be marked as incorrect.
              </p>
            </div>
          )}
          {session.flaggedQuestions.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
              <Flag className="h-5 w-5 shrink-0 text-indigo-500" />
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                You have <strong>{session.flaggedQuestions.length}</strong> question{session.flaggedQuestions.length > 1 ? 's' : ''} flagged for review.
              </p>
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Once submitted, you <strong>cannot</strong> return to this test. Are you sure you want to submit?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Continue Test
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false)
                submitOnce(session)
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
              Submit Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
