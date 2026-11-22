import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import type { AuthUser } from '../../types'

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<AuthUser>
  onBootstrap: (input: { email: string; displayName: string; password: string }) => Promise<AuthUser>
  setupAvailable: boolean
}

export function LoginPage({ onLogin, onBootstrap, setupAvailable }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'setup'>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'setup') {
        await onBootstrap({ email, displayName, password })
      } else {
        await onLogin(email, password)
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><span className="brand-mark"><Sparkles size={19} /></span><strong>ARIA</strong></div>
        <div className="auth-heading">
          <div className="auth-icon"><LockKeyhole size={20} /></div>
          <div>
            <h1 id="auth-title">{mode === 'setup' ? 'Set up your admin account' : 'Welcome back'}</h1>
            <p>{mode === 'setup' ? 'Create the first administrator for this ARIA instance.' : 'Sign in to continue to the support workspace.'}</p>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'setup' && (
            <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></label>
          )}
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'setup' ? 'Create admin account' : 'Sign in'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
        {setupAvailable && (
          <button className="auth-switch" type="button" onClick={() => { setMode((current) => current === 'login' ? 'setup' : 'login'); setError('') }}>
            {mode === 'setup' ? 'Already have an account? Sign in' : 'First-time setup'}
          </button>
        )}
        <div className="auth-note"><ShieldCheck size={15} /><span>ARIA uses role-based access and expiring sessions.</span></div>
      </section>
    </main>
  )
}
