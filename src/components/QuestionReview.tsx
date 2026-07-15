import { CheckCircle2, ChevronDown, XCircle, Code2 } from 'lucide-react'
import { useState } from 'react'
import type { Question, Answer } from '../types'

const LABELS = ['A', 'B', 'C', 'D'] as const

interface QuestionReviewProps {
  questions: Question[]
  answers: Answer[]
}

export function QuestionReview({ questions, answers }: QuestionReviewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => {
        const selected = answers[idx]
        // We only show simple visual check for MCQ here, coding evaluation needs backend scores
        const isCorrect = q.type === 'coding' ? false : selected === q.correctIndex
        const isOpen = expanded[q.id] ?? false

        return (
          <div
            key={q.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => toggle(q.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {q.type === 'coding' ? (
                <Code2 className="h-5 w-5 shrink-0 text-slate-400" />
              ) : isCorrect ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              )}
              <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                Q{idx + 1}. {q.text}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="animate-fade-in border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                {q.imageUrl && (
                  <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 max-w-lg">
                    <img src={q.imageUrl} alt="Question Graphic" className="max-h-60 max-w-full object-contain" />
                  </div>
                )}
                {q.type === 'coding' ? (
                   <div className="space-y-2">
                     <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Your Submitted Code:</p>
                     <pre className="rounded bg-slate-50 p-3 text-xs font-mono text-slate-800 overflow-x-auto dark:bg-slate-950 dark:text-slate-300">
                       {typeof selected === 'object' && selected !== null ? selected.code : 'No code submitted.'}
                     </pre>
                   </div>
                ) : (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oi) => {
                      const isSelected = selected === oi
                      const isAnswer = q.correctIndex === oi
                      let cls =
                        'rounded-lg border px-3 py-2 text-sm border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                      if (isAnswer) {
                        cls =
                          'rounded-lg border px-3 py-2 text-sm border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      } else if (isSelected && !isCorrect) {
                        cls =
                          'rounded-lg border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                      }
                      return (
                        <div key={oi} className={`${cls} flex flex-col gap-2`}>
                          <div>
                            <span className="font-mono font-semibold">{LABELS[oi]}.</span> {opt}
                            {isAnswer && (
                              <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                (Correct)
                              </span>
                            )}
                            {isSelected && !isAnswer && (
                              <span className="ml-2 text-xs font-medium text-red-500">(Your choice)</span>
                            )}
                          </div>
                          {q.optionImages?.[oi] && (
                            <div className="mt-1 self-start overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
                              <img src={q.optionImages[oi]} alt={`Option ${LABELS[oi]} Graphic`} className="max-h-32 max-w-full object-contain" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
