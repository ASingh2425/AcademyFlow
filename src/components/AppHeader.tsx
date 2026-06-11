import { GraduationCap } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

interface AppHeaderProps {
  darkMode: boolean
  onToggleDark: () => void
  label: string
  examActive?: boolean
}

export function AppHeader({ darkMode, onToggleDark, label, examActive }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              AcademyFlow
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Academic MCQ & Diagnostic Platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`hidden rounded-full px-3 py-1 font-mono text-xs sm:inline-block ${
              examActive
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {examActive ? '● EXAM LOCKED' : label}
          </span>
          <ThemeToggle darkMode={darkMode} onToggle={onToggleDark} />
        </div>
      </div>
    </header>
  )
}
