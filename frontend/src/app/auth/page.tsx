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
  const [showPw, setShowPw] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const router   = useRouter()
  const { loading } = useSelector((s: RootState) => s.auth)

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
      toast.error(res.payload as string || 'Authentication failed')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background:'#F8FAFC' }}>

      {/* Left panel — Umurava blue */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background:'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)' }}>

        {/* Background decoration */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
          <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
          <div style={{ position:'absolute', top:'40%', left:'30%', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(255,255,255,0.15)' }}>
              <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M20 9.5C14.201 9.5 9.5 14.201 9.5 20S14.201 30.5 20 30.5 30.5 25.799 30.5 20 25.799 9.5 20 9.5zM16 18.5c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4z"
                  fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:22, letterSpacing:'-0.03em' }}>
                competence<span>.</span>
              </div>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:10, letterSpacing:'0.08em', fontFamily:'DM Mono, monospace' }}>
                BY UMURAVA
              </div>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 style={{ color:'white', fontSize:40, fontWeight:800, lineHeight:1.1, letterSpacing:'-0.03em', marginBottom:16 }}>
            AI-Powered<br/>Candidate<br/>Screening
          </h1>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:16, lineHeight:1.6, maxWidth:360 }}>
            Screen candidates 10× faster with Gemini AI. Get ranked shortlists, explainable scores, and deep insights — built for Umurava's talent ecosystem.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            {[['10×','Faster screening'],['100%','Explainable AI'],['40+','Candidate profiles']].map(([num, label]) => (
              <div key={num}>
                <div style={{ color:'white', fontSize:28, fontWeight:800, letterSpacing:'-0.02em' }}>{num}</div>
                <div style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="relative z-10">
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>
            Built for the Umurava AI Hackathon · competence.umurava.africa
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div style={{ color:'#2563EB', fontWeight:800, fontSize:24, letterSpacing:'-0.03em' }}>competence.</div>
          <div style={{ color:'#94A3B8', fontSize:11 }}>BY UMURAVA</div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 style={{ color:'var(--text-primary)', fontSize:24, fontWeight:700, letterSpacing:'-0.02em', marginBottom:6 }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p style={{ color:'var(--text-secondary)', fontSize:14 }}>
              {mode === 'login' ? 'Welcome back. Enter your credentials.' : 'Start screening candidates with AI.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background:'var(--bg)', border:'1px solid var(--border)' }}>
            {(['login','register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
                style={{
                  background: mode === m ? '#2563EB' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text-secondary)',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Amina Nkurunziza" value={form.name} onChange={set('name')} required />
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="admin@umurava.africa" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label" style={{ marginBottom:0 }}>Password</label>
                {mode === 'login' && <button type="button" style={{ fontSize:12, color:'#2563EB' }}>Forgot?</button>}
              </div>
              <div style={{ position:'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'}
                  placeholder="••••••••" value={form.password} onChange={set('password')} required
                  style={{ paddingRight:40 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary justify-center py-3 mt-1"
              style={{ width:'100%', fontSize:14 }}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span className="animate-spin" style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block' }} />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>
              Demo credentials:
            </p>
            <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
              admin@umurava.africa / Admin@123456
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
