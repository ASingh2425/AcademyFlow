import { GraduationCap, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { api } from '../lib/api'

export function AdminLoginView() {
  const { login } = useAdmin()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Password is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.adminLogin(password)
      login(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 shadow-2xl shadow-indigo-500/40">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AcademyFlow</h1>
          <p className="mt-1 text-sm text-slate-400">Creator Studio — Admin Access</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Admin Login</h2>
              <p className="text-xs text-slate-400">Enter your admin password to continue</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="animate-shake rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 py-3 font-medium text-white transition-all duration-200 hover:bg-indigo-600 disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Default password is set via <span className="font-mono text-slate-400">ADMIN_PASSWORD</span> in <span className="font-mono text-slate-400">.env</span>
          </p>
        </div>
      </div>
    </div>
  )
}
