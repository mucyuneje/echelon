'use client'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { jobsAPI, candidatesAPI } from '@/lib/api'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/components/ThemeProvider'

interface Job { _id: string; title: string; company: string; location: string; structuredRequirements?: any; createdAt?: string }

const container = { hidden:{opacity:0}, visible:{opacity:1,transition:{staggerChildren:0.07,delayChildren:0.05}} }
const item: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20
    }
  }
};

function AnimatedNumber({ value }: { value: number }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let s = 0; const t = performance.now()
    const go = (now: number) => {
      const p = Math.min((now-t)/600,1); const e = 1-Math.pow(1-p,3)
      setD(Math.floor(e*value)); if (p<1) requestAnimationFrame(go)
    }
    requestAnimationFrame(go)
  }, [value])
  return <>{d}</>
}

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium"
      style={ready
        ? {background:'rgba(0,200,150,0.1)',color:'#059669',border:'1px solid rgba(0,200,150,0.2)'}
        : {background:'rgba(245,158,11,0.1)',color:'#D97706',border:'1px solid rgba(245,158,11,0.2)'}}>
      {ready ? '✓ AI Ready' : '⏳ Analyzing'}
    </span>
  )
}

export default function DashboardPage() {
  const user    = useSelector((s: RootState) => s.auth.user)
  const { theme } = useTheme()
  const isDark  = theme === 'dark'
  const [jobs,  setJobs]    = useState<Job[]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([jobsAPI.list(), candidatesAPI.list({ limit:1 })])
      .then(([jr, cr]) => { setJobs(jr.data.data?.slice(0,5)||[]); setTotal(cr.data.total||0) })
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour<12 ? 'Good morning' : hour<18 ? 'Good afternoon' : 'Good evening'
  const isAdmin  = user?.role === 'admin'
  const aiReady  = jobs.filter(j => j.structuredRequirements).length

  const STATS = [
    { label:'Active Jobs',      val:jobs.length, icon:'💼', href:'/jobs',       color:'#2563EB' },
    { label:'Candidates',       val:total,       icon:'👤', href:'/candidates', color:'#7C3AED' },
    { label:'AI Analyzed',      val:aiReady,     icon:'✓',  href:'/jobs',       color:'#059669' },
    { label:'Ready to Screen',  val:aiReady,     icon:'▶',  href:'/jobs',       color:'#D97706' },
  ]

  const ACTIONS = [
    { href:'/jobs/new',   title:'Post a Job',        desc:'Create a position — AI analyzes requirements automatically', icon:'📋' },
    { href:'/candidates', title:'Upload Candidates',  desc:'Import CVs, spreadsheets, or Umurava talent profiles',     icon:'📤' },
    { href:'/jobs',       title:'Run Screening',      desc:'Pick a job and screen all assigned candidates with AI',     icon:'🔍' },
  ]

  const cardBg    = isDark ? 'rgba(13,18,26,0.8)' : '#FFFFFF'
  const cardBdr   = isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'
  const textPri   = isDark ? '#F1F5F9' : '#0F172A'
  const textSec   = isDark ? '#94A3B8' : '#475569'
  const textMut   = isDark ? '#475569' : '#94A3B8'
  const rowBg     = isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC'
  const rowBdrHov = isDark ? 'rgba(255,255,255,0.12)' : '#BFDBFE'

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={item} className="mb-8 flex items-start justify-between gap-4">
          <div>
            {/* Umurava-style breadcrumb */}
            <p style={{ fontSize:12, color:textMut, marginBottom:4 }}>{greeting},</p>
            <h1 style={{ fontSize:28, fontWeight:700, color:textPri, letterSpacing:'-0.02em', marginBottom:4 }}>
              Welcome Back {user?.name?.split(' ')[0] || 'Recruiter'},
            </h1>
            <p style={{ fontSize:14, color:textSec }}>
              Screen candidates with AI · Powered by Umurava Competence
            </p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs px-3 py-1 rounded-full font-medium"
                style={{ background:'rgba(37,99,235,0.1)', color:'#2563EB', border:'1px solid rgba(37,99,235,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Admin — seeing all data
              </span>
            )}
          </div>
        </motion.div>

        {/* Stats — Umurava card style with left color border */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(loading ? Array(4).fill(null) : STATS).map((s, i) => (
            <div key={i}>
              {loading ? (
                <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:12, padding:'20px 16px', height:100 }}
                  className="shimmer" />
              ) : (
                <Link href={s!.href}
                  className="block group transition-all duration-200"
                  style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:12, padding:'20px 16px',
                           borderLeft:`4px solid ${s!.color}`, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{s!.icon}</div>
                  <p style={{ fontSize:26, fontWeight:700, color:s!.color, fontFamily:'DM Mono, monospace', lineHeight:1 }}>
                    <AnimatedNumber value={s!.val} />
                  </p>
                  <p style={{ fontSize:12, color:textSec, marginTop:4, fontWeight:500 }}>{s!.label}</p>
                </Link>
              )}
            </div>
          ))}
        </motion.div>

        {/* Recent Jobs — Umurava list style */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize:18, fontWeight:700, color:textPri }}>Recent Jobs</h2>
            <Link href="/jobs"
              style={{ fontSize:13, color:'#2563EB', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
              See all →
            </Link>
          </div>

          <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="shimmer h-14 rounded-lg" />)}
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                  <p style={{ color:textPri, fontWeight:600, marginBottom:6 }}>No jobs yet</p>
                  <p style={{ color:textSec, fontSize:13, marginBottom:20 }}>Create a job to start screening candidates</p>
                  <Link href="/jobs/new" className="btn-primary inline-flex">Create First Job</Link>
                </div>
              ) : (
                <div>
                  {jobs.map((job, i) => (
                    <motion.div key={job._id}
                      initial={{ opacity:0, x:-12 }}
                      animate={{ opacity:1, x:0 }}
                      transition={{ delay: i*0.06, type:'spring', stiffness:300, damping:28 }}>
                      <Link href={`/jobs/${job._id}`}
                        className="flex items-center gap-3 px-5 py-3.5 group transition-all duration-150"
                        style={{ borderBottom: i < jobs.length-1 ? `1px solid ${cardBdr}` : 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(37,99,235,0.05)' : '#EFF6FF'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.15)' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="#2563EB" strokeWidth="1.2"/>
                            <path d="M4 3V2a1 1 0 011-1h4a1 1 0 011 1v1" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color:textPri, fontSize:14, fontWeight:600 }} className="truncate">{job.title}</p>
                          <p style={{ color:textMut, fontSize:12 }}>{job.company} · {job.location}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge ready={!!job.structuredRequirements} />
                          <Link href={`/screening/${job._id}`} onClick={e => e.stopPropagation()}
                            className="btn-primary text-xs px-3 py-1.5">Screen</Link>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item}>
          <h2 style={{ fontSize:18, fontWeight:700, color:textPri, marginBottom:16 }}>Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACTIONS.map((a, i) => (
              <Link key={i} href={a.href}
                className="group transition-all duration-200"
                style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:12, padding:20, display:'block',
                         boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#2563EB'; el.style.boxShadow='0 4px 12px rgba(37,99,235,0.12)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=cardBdr; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:28, marginBottom:12 }}>{a.icon}</div>
                <p style={{ color:textPri, fontWeight:700, fontSize:14, marginBottom:6 }}>{a.title}</p>
                <p style={{ color:textSec, fontSize:12, lineHeight:1.6 }}>{a.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
