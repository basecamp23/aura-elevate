'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const sb = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div className="logo-mark" style={{ width: 32, height: 32 }}>
            <svg viewBox="0 0 14 14" fill="none" width={16} height={16}>
              <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 8H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="logo-text" style={{ fontSize: 16 }}>Elevate</div>
            <div className="logo-sub">Aura Aesthetica</div>
          </div>
        </div>

        {sent ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.
            </div>
            <button className="btn" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }} onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sign in</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Magic link — no password required</div>
            {error && <div className="auth-error">{error}</div>}
            <input
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 13 }}
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
