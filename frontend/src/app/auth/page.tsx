'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { loginThunk, registerThunk } from '@/store/slices/authSlice'
import { AppDispatch, RootState } from '@/store'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const { loading, error } = useSelector((s: RootState) => s.auth)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const action = mode === 'login'
      ? loginThunk({ email: form.email, password: form.password })
      : registerThunk({ name: form.name, email: form.email, password: form.password })
    const res = await dispatch(action as any)
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      router.push('/dashboard')
    } else {
      toast.error(res.payload as string)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-jade/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-jade/3 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(0,200,150,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-jade/10 border border-jade/20 rounded-2xl mb-5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9v10L14 25 3 19V9L14 3z" stroke="#00C896" strokeWidth="1.5" fill="none"/>
              <circle cx="14" cy="14" r="4" fill="#00C896"/>
            </svg>
          </div>
          <h1 className="text-2xl font-display text-white">Umurava Recruit AI</h1>
          <p className="text-white/40 text-sm mt-1">AI-powered candidate screening</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {/* Mode tabs */}
          <div className="flex bg-white/5 rounded-lg p-1 mb-7">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === m ? 'bg-jade text-ink' : 'text-white/50 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Amina Nkurunziza" value={form.name} onChange={set('name')} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="admin@umurava.africa" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-3 mt-2 disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-5">
            Demo: admin@umurava.africa / Admin@123456
          </p>
        </div>
      </div>
    </div>
  )
}
