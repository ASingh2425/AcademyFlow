import { AlertTriangle, Loader2, LogIn, Mail, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useStudent } from '../context/StudentContext'
import { api } from '../lib/api'

type AuthMode = 'signup' | 'login' | 'verify'

interface StudentAuthViewProps {
  onAuthenticated: () => void
}

export function StudentAuthView({ onAuthenticated }: StudentAuthViewProps) {
  const { setStudent } = useStudent()
  const [mode, setMode] = useState<AuthMode>('signup')
  const [fullName, setFullName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetMessages = () => {
    setError('')
    setInfo('')
    setDevCode(null)
  }

  const handleSignup = async () => {
    resetMessages()
    if (!fullName.trim() || !registrationNumber.trim() || !email.trim()) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    try {
      const res = await api.signup({ fullName, registrationNumber, email })
      setInfo(res.message)
      if (res.devCode) setDevCode(res.devCode)
      setMode('verify')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    resetMessages()
    if (!registrationNumber.trim() || !email.trim()) {
      setError('Registration number and email are required.')
      return
    }
    setLoading(true)
    try {
      const res = await api.login({ registrationNumber, email })
      if (res.requiresVerification) {
        setInfo(res.message || 'Please verify your email.')
        if (res.devCode) setDevCode(res.devCode)
        setMode('verify')
      } else if (res.student) {
        setStudent(res.student)
        onAuthenticated()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    resetMessages()
    if (!email.trim() || !code.trim()) {
      setError('Email and verification code are required.')
      return
    }
    setLoading(true)
    try {
      const res = await api.verify({ email, code })
      setStudent(res.student)
      onAuthenticated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    resetMessages()
    setLoading(true)
    try {
      const res = await api.resendCode({ registrationNumber, email })
      setInfo(res.message)
      if (res.devCode) setDevCode(res.devCode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-md px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {mode === 'verify' ? 'Verify Your Email' : mode === 'login' ? 'Student Login' : 'Student Sign Up'}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Authenticate with your registration number and email before taking the test.
        </p>

        {mode !== 'verify' && (
          <div className="mt-4 flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setMode('signup'); resetMessages() }}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors duration-200 ${
                mode === 'signup'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); resetMessages() }}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors duration-200 ${
                mode === 'login'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="Your full name"
              />
            </div>
          )}

          {mode !== 'verify' && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. REG2024001"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="you@university.edu"
                />
              </div>
            </>
          )}

          {mode === 'verify' && (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Mail className="h-4 w-4 shrink-0" />
                Enter the 6-digit code sent to <strong>{email}</strong>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="000000"
                />
              </div>
            </>
          )}

          {error && (
            <p className="animate-shake flex items-center gap-1 text-sm text-red-500">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          )}
          {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}
          {devCode && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Dev mode — SMTP not configured. Your code:
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-amber-900 dark:text-amber-200">
                {devCode}
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <button
              type="button"
              onClick={handleSignup}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 py-3 font-medium text-white transition-colors duration-200 hover:bg-indigo-600 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign Up & Send Code
            </button>
          )}
          {mode === 'login' && (
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 py-3 font-medium text-white transition-colors duration-200 hover:bg-indigo-600 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Login
            </button>
          )}
          {mode === 'verify' && (
            <>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 py-3 font-medium text-white transition-colors duration-200 hover:bg-indigo-600 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify Email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full text-sm text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Resend verification code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
