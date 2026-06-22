import {
  Check,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  LogOut,
  Plus,
  Trash2,
  Users,
  UserX,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { QuestionReview } from '../components/QuestionReview'
import { useAdmin } from '../context/AdminContext'
import { api } from '../lib/api'
import { formatDuration } from '../lib/scoring'
import { formatScheduleRange } from '../lib/schedule'
import { copyToClipboard, getTestShareUrl } from '../lib/storage'
import type { Student, Submission, Test } from '../types'

interface AdminDashboardProps {
  tests: Test[]
  submissions: Submission[]
  onCreateTest: () => void
  onEditTest: (testId: string) => void
  onDeleteTest: (testId: string) => void
  onDuplicateTest: (test: Test) => void
  onViewSubmission: (submissionId: string) => void
  onRefresh: () => void
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportSubmissionsCSV(submissions: Submission[], tests: Test[]) {
  const testMap = new Map(tests.map((t) => [t.id, t]))
  const headers = [
    'Candidate Name',
    'Registration Number',
    'Email',
    'Test Title',
    'Test Code',
    'Score',
    'Total Marks',
    'Percentage',
    'Duration',
    'Submitted At',
    'Integrity Flags',
    'Result',
  ]

  const rows = submissions.map((sub) => {
    const test = testMap.get(sub.testId)
    const total = sub.totalMarks ?? sub.totalQuestions
    const pct = total > 0 ? Math.round((sub.score / total) * 100) : 0
    const passMark = test?.passMark ?? 50
    return [
      `"${sub.candidateName}"`,
      `"${sub.registrationNumber}"`,
      `"${sub.email}"`,
      `"${sub.testTitle}"`,
      `"${test?.code ?? ''}"`,
      sub.score,
      total,
      `${pct}%`,
      formatDuration(sub.durationSeconds),
      `"${new Date(sub.submittedAt).toLocaleString()}"`,
      sub.proctorEvents.length,
      pct >= passMark ? 'PASS' : 'FAIL',
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `submissions_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AdminDashboard({
  tests,
  submissions,
  onCreateTest,
  onEditTest,
  onDeleteTest,
  onDuplicateTest,
  onViewSubmission,
  onRefresh,
}: AdminDashboardProps) {
  const { logout } = useAdmin()
  const [tab, setTab] = useState<'tests' | 'submissions' | 'students'>('tests')
  const [filterTestId, setFilterTestId] = useState<string>('all')
  const [inspectorSub, setInspectorSub] = useState<Submission | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)

  // Students tab state
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  const stats = useMemo(() => {
    const totalTests = tests.length
    const totalSubs = submissions.length
    let totalScore = 0
    let totalMarks = 0
    let passedCount = 0
    let flaggedCount = 0

    submissions.forEach((sub) => {
      totalScore += sub.score
      const totalQMarks = sub.totalMarks ?? sub.totalQuestions
      totalMarks += totalQMarks
      const test = tests.find((t) => t.id === sub.testId)
      const pct = totalQMarks > 0 ? (sub.score / totalQMarks) * 100 : 0
      if (pct >= (test?.passMark ?? 50)) {
        passedCount++
      }
      if (sub.proctorEvents.length > 0) {
        flaggedCount++
      }
    })

    const avgPct = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0
    const passRate = totalSubs > 0 ? Math.round((passedCount / totalSubs) * 100) : 0
    const cleanRate = totalSubs > 0 ? Math.round(((totalSubs - flaggedCount) / totalSubs) * 100) : 100

    return { totalTests, totalSubs, avgPct, passRate, cleanRate }
  }, [tests, submissions])

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    try {
      const data = await api.getStudents()
      setStudents(data)
    } catch {
      // silently fail
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'students') loadStudents()
  }, [tab, loadStudents])

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Delete this student and all their submissions?')) return
    await api.deleteStudent(studentId)
    await loadStudents()
    onRefresh()
  }

  const handleExtraTime = async (student: Student, minutes: number) => {
    const updated = await api.setStudentExtraTime(student.id, Math.max(0, Math.min(240, minutes)))
    setStudents((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Delete this submission? The student will be able to retake the test.')) return
    await api.deleteSubmission(submissionId)
    onRefresh()
  }

  const handleLogout = async () => {
    await api.adminLogout()
    logout()
  }

  const copyLink = async (testId: string) => {
    const url = getTestShareUrl(testId)
    await copyToClipboard(url)
    setCopiedId(testId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredSubmissions = useMemo(() => {
    if (filterTestId === 'all') return submissions
    return submissions.filter((s) => s.testId === filterTestId)
  }, [submissions, filterTestId])

  const getTestSubmissions = (testId: string) =>
    submissions.filter((s) => s.testId === testId)

  const inspectorTest = inspectorSub
    ? tests.find((t) => t.id === inspectorSub.testId)
    : null

  const tabs = [
    { id: 'tests' as const, label: 'My Published Tests', icon: FileText },
    { id: 'submissions' as const, label: 'Candidate Submissions', icon: Users },
    { id: 'students' as const, label: 'Students', icon: UserX },
  ]

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Creator Studio</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create tests, share links with students, and review scores
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateTest}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" />
            New Assessment
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of admin"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Visual Analytics */}
      {submissions.length > 0 && (
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Pass Rate Ring */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pass Rate</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{stats.passRate}%</h3>
              <p className="mt-1 text-xs text-slate-400">Passing threshold met</p>
            </div>
            <div className="relative h-16 w-16">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${stats.passRate}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Average Score Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Average Score</p>
              <h3 className="mt-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.avgPct}%</h3>
              <p className="mt-1 text-xs text-slate-400">Overall cohort mean</p>
            </div>
            <div className="relative h-16 w-16">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${stats.avgPct}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Integrity Index */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Integrity Index</p>
              <h3 className="mt-1 text-3xl font-bold text-amber-500">{stats.cleanRate}%</h3>
              <p className="mt-1 text-xs text-slate-400">No flags recorded</p>
            </div>
            <div className="relative h-16 w-16">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${stats.cleanRate}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/50">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
              tab === id
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tests Tab ── */}
      {tab === 'tests' && (
        <div className="space-y-4">
          {tests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">No tests published yet.</p>
              <button
                type="button"
                onClick={onCreateTest}
                className="mt-4 text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Create your first assessment
              </button>
            </div>
          ) : (
            tests.map((test) => {
              const testSubs = getTestSubmissions(test.id)
              const isExpanded = expandedTestId === test.id
              return (
                <div
                  key={test.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 transition-colors duration-200 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {test.code}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {test.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {test.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        <span>{test.questions.length} questions</span>
                        <span>{test.timeLimitMinutes} min limit</span>
                        <span>{testSubs.length} submission(s)</span>
                        {test.passMark !== undefined && (
                          <span>Pass ≥ {test.passMark}%</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Window: {formatScheduleRange(test)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyLink(test.id)}
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 transition-colors duration-200 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        {copiedId === test.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedId === test.id ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditTest(test.id)}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateTest(test)}
                        title="Duplicate test"
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <FileText className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTest(test.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {testSubs.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Recent Submissions
                        </p>
                        {testSubs.length > 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTestId(isExpanded ? null : test.id)
                            }
                            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            {isExpanded
                              ? 'Show less'
                              : `View all ${testSubs.length}`}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(isExpanded ? testSubs : testSubs.slice(0, 3)).map((sub) => (
                          <div
                            key={sub.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                          >
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {sub.candidateName}
                              <span className="ml-2 font-mono text-xs text-slate-400">
                                {sub.registrationNumber}
                              </span>
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-slate-500">
                                {sub.score}/{sub.totalMarks ?? sub.totalQuestions}
                              </span>
                              <button
                                type="button"
                                onClick={() => setInspectorSub(sub)}
                                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                Inspect
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubmission(sub.id)}
                                title="Delete submission (allows retake)"
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Submissions Tab ── */}
      {tab === 'submissions' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={filterTestId}
                onChange={(e) => setFilterTestId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="all">All Tests</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            {filteredSubmissions.length > 0 && (
              <button
                type="button"
                onClick={() => exportSubmissionsCSV(filteredSubmissions, tests)}
                className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                  {['Candidate', 'Reg. No.', 'Test', 'Score', 'Duration', 'Security', 'Result', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      No submissions found.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => {
                    const test = tests.find((t) => t.id === sub.testId)
                    const total = sub.totalMarks ?? sub.totalQuestions
                    const pct = total > 0 ? Math.round((sub.score / total) * 100) : 0
                    const passed = pct >= (test?.passMark ?? 50)
                    return (
                      <tr
                        key={sub.id}
                        className="border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {sub.candidateName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {sub.registrationNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {sub.testTitle}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {sub.score}/{total} ({pct}%)
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {formatDuration(sub.durationSeconds)}
                        </td>
                        <td className="px-4 py-3">
                          {sub.proctorEvents.length === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Pristine</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              {sub.proctorEvents.length} flags
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              passed
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            }`}
                          >
                            {passed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setInspectorSub(sub)}
                              className="flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubmission(sub.id)}
                              title="Delete (allow retake)"
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Students Tab ── */}
      {tab === 'students' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {students.length} registered student{students.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={loadStudents}
              className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Refresh
            </button>
          </div>
          {studentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">No students registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                    {['Name', 'Reg. No.', 'Email', 'Status', 'Registered', 'Extra Time', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const subCount = submissions.filter((s) => s.studentId === student.id).length
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {student.fullName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {student.registrationNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {student.email}
                        </td>
                        <td className="px-4 py-3">
                          {student.verified ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Verified
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {student.createdAt
                            ? new Date(student.createdAt).toLocaleDateString()
                            : '—'}
                          <span className="ml-2 font-mono">({subCount} sub{subCount !== 1 ? 's' : ''})</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                              +{student.extraTimeMinutes ?? 0} min
                            </span>
                            <button
                              type="button"
                              onClick={() => handleExtraTime(student, (student.extraTimeMinutes ?? 0) + 15)}
                              className="rounded border border-indigo-300 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300"
                              aria-label={`Add 15 minutes for ${student.fullName}`}
                            >
                              +15
                            </button>
                            {(student.extraTimeMinutes ?? 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => handleExtraTime(student, 0)}
                                className="text-xs text-slate-500 hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id)}
                            className="flex items-center gap-1 text-sm text-red-500 hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Inspector Modal */}
      <Modal
        open={!!inspectorSub}
        onClose={() => setInspectorSub(null)}
        title="Candidate Sheet Inspector"
        wide
      >
        {inspectorSub && inspectorTest && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Candidate</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {inspectorSub.candidateName}
                </p>
                <p className="font-mono text-xs text-slate-500">{inspectorSub.registrationNumber}</p>
                <p className="text-xs text-slate-500">{inspectorSub.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Score</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">
                  {inspectorSub.score}/{inspectorSub.totalMarks ?? inspectorSub.totalQuestions}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
                <p className="font-mono text-slate-900 dark:text-white">
                  {formatDuration(inspectorSub.durationSeconds)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Submitted</p>
                <p className="text-sm text-slate-900 dark:text-white">
                  {new Date(inspectorSub.submittedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ClipboardList className="h-4 w-4" />
                Proctor Audit Trail
              </p>
              {inspectorSub.proctorEvents.length === 0 ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  No integrity violations recorded.
                </p>
              ) : (
                <div className="space-y-1 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                  {inspectorSub.proctorEvents.map((ev, i) => (
                    <p key={i} className="font-mono text-xs text-amber-800 dark:text-amber-300">
                      {ev.message}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                Response Sheet
              </p>
              <QuestionReview
                questions={inspectorTest.questions}
                answers={inspectorSub.answers}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onViewSubmission(inspectorSub.id)
                setInspectorSub(null)
              }}
              className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-600"
            >
              Open Full Results View
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
