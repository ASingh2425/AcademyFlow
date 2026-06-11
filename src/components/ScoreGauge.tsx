import { CheckCircle2, XCircle } from 'lucide-react'
import { getFeedbackTier, getPassFail } from '../lib/scoring'

interface ScoreGaugeProps {
  score: number
  total: number
  totalMarks?: number
  passMark?: number
}

export function ScoreGauge({ score, total, totalMarks, passMark }: ScoreGaugeProps) {
  const marksDenominator = totalMarks ?? total
  const percentage = marksDenominator > 0 ? Math.round((score / marksDenominator) * 100) : 0
  const { label, message } = getFeedbackTier(percentage)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (percentage / 100) * circumference

  const passResult = passMark !== undefined ? getPassFail(score, marksDenominator, passMark) : null

  const gaugeColor =
    percentage >= (passMark ?? 50)
      ? 'text-emerald-500'
      : percentage >= 40
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="relative">
        <svg width="140" height="140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-slate-200 dark:text-slate-800"
          />
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${gaugeColor} transition-all duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white">
            {percentage}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {score}/{marksDenominator} marks
          </span>
        </div>
      </div>

      {/* Pass / Fail badge */}
      {passResult && (
        <div
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold ${
            passResult === 'pass'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
          }`}
        >
          {passResult === 'pass' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {passResult === 'pass' ? 'PASS' : 'FAIL'}
          {passMark !== undefined && (
            <span className="ml-1 font-normal opacity-70">(threshold {passMark}%)</span>
          )}
        </div>
      )}

      <div className="text-center">
        <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{label}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  )
}
