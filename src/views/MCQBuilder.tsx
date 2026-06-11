import {
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import type { BuilderQuestion, Test } from '../types'
import { generateId } from '../lib/storage'

const LABELS = ['A', 'B', 'C', 'D'] as const

function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (!iso) {
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultEndFromStart(startLocal: string): string {
  const d = new Date(startLocal)
  d.setHours(d.getHours() + 2)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function emptyQuestion(): BuilderQuestion {
  return {
    id: generateId('bq'),
    text: '',
    options: ['', '', '', ''],
    correctIndex: null,
    marks: 1,
  }
}

interface MCQBuilderProps {
  editingTest?: Test
  onSave: (test: Test) => void
  onCancel: () => void
}

export function MCQBuilder({ editingTest, onSave, onCancel }: MCQBuilderProps) {
  const [title, setTitle] = useState(editingTest?.title ?? '')
  const [description, setDescription] = useState(editingTest?.description ?? '')
  const [timeLimit, setTimeLimit] = useState(editingTest?.timeLimitMinutes ?? 15)
  const [passMark, setPassMark] = useState(editingTest?.passMark ?? 50)
  const [scheduledStart, setScheduledStart] = useState(
    toDatetimeLocal(editingTest?.scheduledStart)
  )
  const [scheduledEnd, setScheduledEnd] = useState(
    toDatetimeLocal(editingTest?.scheduledEnd || defaultEndFromStart(toDatetimeLocal()))
  )
  const [code, setCode] = useState(editingTest?.code ?? '')
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    editingTest
      ? editingTest.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: [...q.options] as [string, string, string, string],
          correctIndex: q.correctIndex,
          marks: q.marks ?? 1,
        }))
      : [emptyQuestion()]
  )
  const [errors, setErrors] = useState<string[]>([])
  const [shake, setShake] = useState(false)

  const totalMarks = questions.reduce((s, q) => s + (q.marks ?? 1), 0)
  const recommendedMax = Math.floor(timeLimit * 1.5)
  const tooManyQuestions = questions.length > recommendedMax

  const updateQuestion = (id: string, patch: Partial<BuilderQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const updateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q
        const opts = [...q.options] as [string, string, string, string]
        opts[optIndex] = value
        return { ...q, options: opts }
      })
    )
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= questions.length) return
    const copy = [...questions]
    ;[copy[index], copy[next]] = [copy[next], copy[index]]
    setQuestions(copy)
  }

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!title.trim()) errs.push('Test title is required.')
    if (timeLimit < 1) errs.push('Time limit must be at least 1 minute.')
    if (passMark < 0 || passMark > 100) errs.push('Pass mark must be between 0 and 100.')
    if (!scheduledStart) errs.push('Scheduled start time is required.')
    if (!scheduledEnd) errs.push('Scheduled end time is required.')
    if (scheduledStart && scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      errs.push('Scheduled end must be after scheduled start.')
    }
    if (questions.length === 0) errs.push('At least one question is required.')
    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`Question ${i + 1}: scenario text is required.`)
      q.options.forEach((opt, oi) => {
        if (!opt.trim()) errs.push(`Question ${i + 1}: option ${LABELS[oi]} is required.`)
      })
      if (q.correctIndex === null) errs.push(`Question ${i + 1}: select the correct answer.`)
      if ((q.marks ?? 1) < 1) errs.push(`Question ${i + 1}: marks must be at least 1.`)
    })
    return errs
  }

  const handlePublish = () => {
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setErrors([])

    const test: Test = {
      id: editingTest?.id ?? generateId('test'),
      code: code.trim() || `TEST-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      title: title.trim(),
      description: description.trim(),
      timeLimitMinutes: timeLimit,
      passMark,
      scheduledStart: new Date(scheduledStart).toISOString(),
      scheduledEnd: new Date(scheduledEnd).toISOString(),
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text.trim(),
        options: q.options.map((o) => o.trim()) as [string, string, string, string],
        correctIndex: q.correctIndex!,
        marks: q.marks ?? 1,
      })),
    }
    onSave(test)
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {editingTest ? 'Edit Assessment' : 'MCQ Builder'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configure metadata and scenario stack
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Python Fundamentals — Module 3"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Code Identifier
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Auto-generated if empty"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Syllabus and scope description"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Time Limit (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Pass Mark (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={passMark}
              onChange={(e) => setPassMark(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-slate-500">Score ≥ {passMark}% → Pass</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Scheduled Start <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Scheduled End <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Students can only start the test between these times. One attempt per student is enforced.
        </p>
      </div>

      {/* Question count warning */}
      {tooManyQuestions && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Too many questions for the time limit
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              {questions.length} questions in {timeLimit} minutes leaves only ~{Math.floor((timeLimit * 60) / questions.length)}s per question.
              Recommended max: <strong>{recommendedMax}</strong> questions.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Scenario Stack</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalMarks} total mark{totalMarks !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          className="flex items-center gap-1 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-600 transition-colors duration-200 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
        >
          <Plus className="h-4 w-4" />
          Add Scenario
        </button>
      </div>

      <div className="space-y-6">
        {questions.map((q, qi) => (
          <div
            key={q.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  Q{qi + 1}
                </span>
                {/* Per-question marks */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Marks:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={q.marks ?? 1}
                    onChange={(e) => updateQuestion(q.id, { marks: Math.max(1, Number(e.target.value)) })}
                    className="w-14 rounded border border-slate-300 px-2 py-0.5 text-center font-mono text-sm outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={qi === 0}
                  onClick={() => moveQuestion(qi, -1)}
                  className="rounded p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-800"
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={qi === questions.length - 1}
                  onClick={() => moveQuestion(qi, 1)}
                  className="rounded p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-800"
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={questions.length <= 1}
                  onClick={() => removeQuestion(q.id)}
                  className="rounded p-1.5 text-red-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-950/30"
                  title="Discard scenario"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Scenario Text
              </label>
              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                rows={2}
                placeholder="Write the question scenario..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Options & Correct Answer Key
              </p>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctIndex === oi}
                    onChange={() => updateQuestion(q.id, { correctIndex: oi })}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  <span className="w-6 font-mono text-sm font-bold text-slate-500">{LABELS[oi]}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(q.id, oi, e.target.value)}
                    placeholder={`Option ${LABELS[oi]}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div
          className={`mt-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30 ${shake ? 'animate-shake' : ''}`}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Validation Errors
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-600 dark:text-red-400">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handlePublish}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 py-3 font-medium text-white transition-colors duration-200 hover:bg-indigo-600"
        >
          <Save className="h-4 w-4" />
          {editingTest ? 'Update Test' : 'Publish Test'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
