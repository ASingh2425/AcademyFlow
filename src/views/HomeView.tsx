import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Link2,
  Lock,
  Shield,
  Timer,
  Users,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Scheduled Assessments',
    description:
      'Set precise open/close windows for each test. Students can only attempt during the allowed period.',
    color: 'from-indigo-500 to-violet-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-100 dark:border-indigo-900/50',
  },
  {
    icon: Shield,
    title: 'Fully Proctored Exams',
    description:
      'Live video & microphone monitoring combined with automatic integrity checks: tab switches, copy-paste, right-click, and keyboard shortcuts are all flagged.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-100 dark:border-emerald-900/50',
  },
  {
    icon: Zap,
    title: 'AI Proctor',
    description:
      '🤖 Real-time AI analysis: Face detection, eye gaze tracking, multiple people detection, and behavior analysis — all processed locally in the browser for complete privacy.',
    color: 'from-violet-500 to-fuchsia-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-100 dark:border-violet-900/50',
  },
  {
    icon: Lock,
    title: 'One Attempt Policy',
    description:
      'Each student is allowed exactly one attempt per test. Duplicate submissions are blocked server-side.',
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-100 dark:border-rose-900/50',
  },
  {
    icon: Timer,
    title: 'Timed with Auto-Submit',
    description:
      'A countdown timer enforces the time limit. The test auto-submits the moment time expires.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900/50',
  },
  {
    icon: Users,
    title: 'Email Verification',
    description:
      'Students register with their institutional email and verify via a 6-digit OTP before they can start.',
    color: 'from-sky-500 to-blue-500',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-100 dark:border-sky-900/50',
  },
  {
    icon: Link2,
    title: 'Shareable Test Links',
    description:
      'Each assessment gets a unique URL. Share it directly with your students — no login required for instructors.',
    color: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-100 dark:border-violet-900/50',
  },
]

export function HomeView() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 text-center sm:px-6">
        {/* Background gradient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute left-1/4 top-1/2 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Academic Assessment Platform
          </div>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            AcademyFlow
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            A secure, timed MCQ platform for instructors and students.
            <br className="hidden sm:block" />
            Create tests, share links, and monitor academic integrity — all in one place.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/admin"
              className="group flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/40"
            >
              Open Creator Studio
              <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Students use the test link shared by their instructor
            </p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Built for academic integrity
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Everything you need to run fair, monitored assessments
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`group rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${f.bg} ${f.border}`}
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}
              >
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-8 text-center text-xl font-bold text-slate-900 dark:text-white">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Instructor creates a test',
                desc: 'Use the Creator Studio to build your MCQ, set the time window and publish.',
              },
              {
                step: '02',
                title: 'Share the link',
                desc: 'Copy the unique test link and share it with your students via email or LMS.',
              },
              {
                step: '03',
                title: 'Students take the test',
                desc: 'Students sign up, verify their email, and complete the timed assessment.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-mono text-xs font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
