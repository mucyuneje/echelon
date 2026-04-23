'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jobsAPI, candidatesAPI } from '@/lib/api'
import Link from 'next/link'
import { Job } from '@/types'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import UploadModal from '@/components/candidates/UploadModal'
import { useTheme } from '@/components/ThemeProvider'
import { PageHeader } from '@/components/ui/PageHeader'

type CandidateMap = Record<string, { count: number; names: string[] }>

function AnimatedCount({ value }: { value: number }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let s = 0; const t = performance.now()
    const go = (now: number) => { const p = Math.min((now-t)/500,1); const e = 1-Math.pow(1-p,3); setD(Math.floor(e*value)); if (p<1) requestAnimationFrame(go) }
    requestAnimationFrame(go)
  }, [value])
  return <>{d}</>
}

function JobRow({ job, i, cnd, isAdmin, isDark, onUpload, onReanalyze, onDelete }: any) {
  const [hov, setHov] = useState(false)
  const [btn, setBtn] = useState<string|null>(null)
  const router = useRouter()

  const cardBg  = isDark ? (hov?'rgba(37,99,235,0.04)':'rgba(13,18,26,0.6)') : (hov?'#EFF6FF':'#FFFFFF')
  const cardBdr = isDark ? (hov?'rgba(37,99,235,0.25)':'rgba(255,255,255,0.07)') : (hov?'#93C5FD':'#E2E8F0')
  const textPri = isDark ? '#F1F5F9' : '#0F172A'
  const textSec = isDark ? '#94A3B8' : '#64748B'
  const isReady = !!job.structuredRequirements

  return (
    <div className="relative"
      style={{ animation:`cardIn 0.45s cubic-bezier(.16,1,.3,1) ${i*55}ms both` }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>

      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:12,
                    borderLeft:`4px solid ${isReady?'#2563EB':'#F59E0B'}`,
                    padding:'16px 18px', transition:'all 0.2s ease', cursor:'pointer', boxShadow: hov?'0 4px 16px rgba(37,99,235,0.08)':'0 1px 3px rgba(0,0,0,0.05)' }}
        onClick={() => router.push(`/jobs/${job._id}`)}>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>

          {/* Icon */}
          <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                        background: isReady?'rgba(37,99,235,0.1)':'rgba(245,158,11,0.1)',
                        border:`1px solid ${isReady?'rgba(37,99,235,0.2)':'rgba(245,158,11,0.2)'}` }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="9" rx="1.5" stroke={isReady?'#2563EB':'#F59E0B'} strokeWidth="1.2"/>
              <path d="M4 3V2a1 1 0 011-1h4a1 1 0 011 1v1" stroke={isReady?'#2563EB':'#F59E0B'} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
              <span style={{ color:textPri, fontWeight:700, fontSize:15 }}>{job.title}</span>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:isDark?'rgba(255,255,255,0.05)':'#F1F5F9', color:textSec, border:`1px solid ${isDark?'rgba(255,255,255,0.07)':'#E2E8F0'}` }}>{job.jobType}</span>
              {isReady
                ? <span style={{ fontSize:10, padding:'2px 9px', borderRadius:20, background:'rgba(5,150,105,0.1)', color:'#059669', border:'1px solid rgba(5,150,105,0.2)', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:4, height:4, borderRadius:'50%', background:'#059669' }} />AI Ready
                  </span>
                : <span style={{ fontSize:10, padding:'2px 9px', borderRadius:20, background:'rgba(245,158,11,0.1)', color:'#D97706', border:'1px solid rgba(245,158,11,0.2)' }}>⏳ Analyzing</span>
              }
              {isAdmin && job.createdBy?.name && (
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:isDark?'rgba(255,255,255,0.03)':'#F8FAFC', color:textSec, border:`1px solid ${isDark?'rgba(255,255,255,0.05)':'#E2E8F0'}` }}>by {job.createdBy.name}</span>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <p style={{ color:textSec, fontSize:13 }}>{job.company} · {job.location}</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <button onClick={e => { e.stopPropagation(); e.preventDefault(); onUpload(job._id) }}
              onMouseEnter={() => setBtn('up')} onMouseLeave={() => setBtn(null)}
              style={{ fontSize:12, fontWeight:500, padding:'6px 12px', borderRadius:8, cursor:'pointer', transition:'all 0.15s',
                       background: btn==='up' ? (isDark?'rgba(255,255,255,0.08)':'#F1F5F9') : 'transparent',
                       border:`1px solid ${isDark?'rgba(255,255,255,0.1)':'#E2E8F0'}`,
                       color: btn==='up' ? '#2563EB' : textSec,
                       display:'flex', alignItems:'center', gap:4 }}>
              + Candidate
            </button>

            <Link href={`/screening/${job._id}`}
              onClick={e => e.stopPropagation()}
              onMouseEnter={() => setBtn('sc')} onMouseLeave={() => setBtn(null)}
              style={{ fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8, cursor:'pointer', transition:'all 0.15s',
                       background: btn==='sc' ? '#1D4ED8' : '#2563EB', color:'white',
                       boxShadow: btn==='sc' ? '0 4px 12px rgba(37,99,235,0.35)' : '0 1px 3px rgba(37,99,235,0.25)',
                       textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}>
              Screen →
            </Link>

            <button onClick={e => { e.stopPropagation(); onReanalyze(e, job._id) }}
              onMouseEnter={() => setBtn('re')} onMouseLeave={() => setBtn(null)}
              style={{ width:32, height:32, borderRadius:8, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                       background: btn==='re' ? (isDark?'rgba(255,255,255,0.08)':'#F1F5F9') : 'transparent',
                       border:`1px solid ${isDark?'rgba(255,255,255,0.08)':'#E2E8F0'}`,
                       color: textSec }}>↻</button>

            <button onClick={e => { e.stopPropagation(); onDelete(e, job._id, job.title) }}
              onMouseEnter={() => setBtn('del')} onMouseLeave={() => setBtn(null)}
              style={{ width:32, height:32, borderRadius:8, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
                       background: btn==='del' ? 'rgba(239,68,68,0.08)' : 'transparent',
                       border: btn==='del' ? '1px solid rgba(239,68,68,0.2)' : `1px solid ${isDark?'rgba(255,255,255,0.08)':'#E2E8F0'}`,
                       color: btn==='del' ? '#EF4444' : textSec }}>✕</button>
          </div>
        </div>

        {/* Skills */}
        {job.structuredRequirements && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:12, paddingTop:12, borderTop:`1px solid ${isDark?'rgba(255,255,255,0.05)':'#F1F5F9'}` }}>
            {(job.structuredRequirements as any).requiredSkills?.slice(0, 5).map((s: string, si: number) => (
              <span key={s} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(37,99,235,0.08)', color:'#2563EB', border:'1px solid rgba(37,99,235,0.15)', animation:`tagIn 0.35s ease ${i*55+si*25+80}ms both` }}>{s}</span>
            ))}
            {(job.structuredRequirements as any).requiredSkills?.length > 5 && (
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:isDark?'rgba(255,255,255,0.04)':'#F8FAFC', color:textSec, border:`1px solid ${isDark?'rgba(255,255,255,0.06)':'#E2E8F0'}` }}>
                +{(job.structuredRequirements as any).requiredSkills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, paddingTop:10, borderTop:`1px solid ${isDark?'rgba(255,255,255,0.04)':'#F8FAFC'}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {cnd.count > 0 && cnd.names.slice(0,3).map((n: string, ii: number) => (
              <div key={ii} style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white', fontWeight:700, marginLeft: ii>0?-8:0, border:`2px solid ${isDark?'rgba(13,18,26,1)':'white'}`, background:`hsl(${210+ii*40},70%,50%)`, zIndex:3-ii, position:'relative' }}>
                {n[0]}
              </div>
            ))}
            <span style={{ fontSize:13, color:textSec, marginLeft: cnd.count>0?4:0 }}>
              <strong style={{ color:isDark?'#F1F5F9':'#0F172A', fontFamily:'DM Mono, monospace' }}>
                {cnd.count>0 ? <AnimatedCount value={cnd.count} /> : 0}
              </strong>{' '}
              candidate{cnd.count!==1?'s':''}
            </span>
          </div>
          <Link href={`/candidates?jobId=${job._id}`}
            onClick={e => e.stopPropagation()}
            style={{ fontSize:12, color:'#2563EB', fontWeight:500, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
            View all →
          </Link>
        </div>

        {hov && (
          <div style={{
            marginTop:10,
            paddingTop:10,
            borderTop:`1px dashed ${isDark?'rgba(255,255,255,0.06)':'#E2E8F0'}`,
            textAlign:'center',
            animation:'fadeHint 0.18s ease both'
          }}>
            <span style={{ fontSize:11, color: isDark?'rgba(148,163,184,0.5)':'#94A3B8', fontStyle:'italic', letterSpacing:'0.01em' }}>
              Click to view full job description →
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cardIn  { from{opacity:0;transform:translateY(12px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes tagIn   { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeHint{ from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  )
}

export default function JobsPage() {
  const [jobs, setJobs]           = useState<Job[]>([])
  const [loading, setLoading]     = useState(true)
  const [candMap, setCandMap]     = useState<CandidateMap>({})
  const [uploadFor, setUploadFor] = useState<string | null>(null)
  const user    = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const textPri = isDark ? '#F1F5F9' : '#0F172A'
  const textSec = isDark ? '#94A3B8' : '#64748B'

  const load = () => {
    setLoading(true)
    Promise.all([jobsAPI.list(), candidatesAPI.countByJob().catch(() => ({ data:{ data:{} } }))])
      .then(([jr, cr]) => { setJobs(jr.data.data||[]); setCandMap(cr.data.data||{}) })
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Delete "${title}"?`)) return
    await jobsAPI.delete(id); toast.success('Job deleted'); load()
  }
  const handleReanalyze = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    const t = toast.loading('Re-analyzing…')
    try { await jobsAPI.analyze(id); toast.dismiss(t); toast.success('Re-analyzed!'); load() }
    catch { toast.dismiss(t); toast.error('Analysis failed') }
  }

  const totalCandidates = Object.values(candMap).reduce((s, v) => s+v.count, 0)

  return (
    <div className="p-4 md:p-6" style={{ maxWidth: 960, width: "100%" }}>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} position${jobs.length!==1?'s':''} · ${totalCandidates} candidates total${isAdmin?' · All recruiters':''}`}
        breadcrumbs={[{ label:'Dashboard', href:'/dashboard' }, { label:'Jobs' }]}
        action={
          <Link href="/jobs/new" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            New Job
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : jobs.length === 0 ? (
        <div style={{ background:isDark?'rgba(13,18,26,0.8)':'#FFFFFF', border:`1px solid ${isDark?'rgba(255,255,255,0.07)':'#E2E8F0'}`, borderRadius:14, padding:'80px 40px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
          <p style={{ color:textPri, fontWeight:700, fontSize:18, marginBottom:8 }}>No jobs yet</p>
          <p style={{ color:textSec, fontSize:14, marginBottom:24 }}>Create a job to start screening candidates with AI</p>
          <Link href="/jobs/new" className="btn-primary inline-flex">Create First Job</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <JobRow key={job._id} job={job} i={i} cnd={candMap[job._id]||{count:0,names:[]}}
              isAdmin={isAdmin} isDark={isDark}
              onUpload={setUploadFor} onReanalyze={handleReanalyze} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {uploadFor && <UploadModal preselectedJobId={uploadFor} onClose={() => { setUploadFor(null); load() }} />}
    </div>
  )
}