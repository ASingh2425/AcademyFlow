import { ChevronDown, Shield } from 'lucide-react'
import { useState } from 'react'
import { QuestionReview } from '../components/QuestionReview'
import { ScoreGauge } from '../components/ScoreGauge'
import { formatDuration, getTotalMarks } from '../lib/scoring'
import type { Submission, Test } from '../types'

interface ResultsViewProps {
  submission: Submission
  test: Test
  isAdmin?: boolean
  onDone: () => void
}

export function ResultsView({ submission, test, isAdmin, onDone }: ResultsViewProps) {
  const [logOpen, setLogOpen] = useState(false)
  const pristine = submission.proctorEvents.length === 0
  const totalMarks = submission.totalMarks ?? getTotalMarks(test.questions)

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Performance Report
        </h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {submission.candidateName} — {submission.testTitle}
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <ScoreGauge
          score={submission.score}
          total={submission.totalQuestions}
          totalMarks={totalMarks}
          passMark={test.passMark}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Duration Taken
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-white">
            {formatDuration(submission.durationSeconds)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Integrity Status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Shield
              className={`h-5 w-5 ${pristine ? 'text-emerald-500' : 'text-amber-500'}`}
            />
            <p className="font-semibold text-slate-900 dark:text-white">
              {pristine
                ? 'Pristine Shield'
                : `${submission.proctorEvents.length} Flagged Event(s)`}
            </p>
          </div>
          {!pristine && (
            <button
              type="button"
              onClick={() => setLogOpen(!logOpen)}
              className="mt-3 flex items-center gap-1 text-sm text-indigo-600 transition-colors duration-200 hover:text-indigo-700 dark:text-indigo-400"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${logOpen ? 'rotate-180' : ''}`}
              />
              View proctor log
            </button>
          )}
          {logOpen && (
            <div className="animate-fade-in mt-3 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              {submission.proctorEvents.map((ev, i) => (
                <p key={i} className="font-mono text-xs text-amber-700 dark:text-amber-400">
                  {ev.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Verification Sheet
        </h3>
        <QuestionReview questions={test.questions} answers={submission.answers} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600"
        >
          {isAdmin ? 'Back to Dashboard' : 'Done'}
        </button>
      </div>
    </div>
  )
}
