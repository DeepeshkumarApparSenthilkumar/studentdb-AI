import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(form)
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue to-cyan flex items-center justify-center">
              <svg className="w-6 h-6 text-bg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h7a1 1 0 010 2H4a1 1 0 01-1-1z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-text-primary">StudentDB</span>
            <span className="badge-cyan text-[10px]">AI</span>
          </div>
          <p className="text-text-secondary text-sm">IIT Chicago AI Academic Platform</p>
        </div>

        {/* Form */}
        <div className="card p-6 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Sign in</h2>
          <p className="text-xs text-text-dim mb-5">Enter your credentials to continue</p>

          {error && (
            <div className="bg-red/10 border border-red/30 text-red text-xs px-3 py-2 rounded-lg font-mono mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Username</label>
              <input
                className="input"
                placeholder="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              ) : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-text-dim mt-4 font-mono">
          StudentDB v1.0 · IIT Chicago · AI Platform
        </p>
      </div>
    </div>
  )
}
