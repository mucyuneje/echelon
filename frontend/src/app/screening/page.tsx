'use client'
import { useEffect, useState, useMemo } from 'react'
import { jobsAPI, screeningAPI, candidatesAPI } from '@/lib/api'
import { Job } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import NewScreeningModal from '@/components/screening/NewScreeningModel'

interface RecentRun {
  jobId: string; jobTitle: string; company: string
  location: string; runDate: string; count: number
  topScore: number; screeningRunId: string
}

function scoreColor(s: number) {
  if (s >= 80) return '#00C896'
  if (s >= 60) return '#2563EB'
  return '#D97706'
}

function ArcScore({ score }: { score: number }) {
  const r = 14, circ = 2 * Math.PI * r
  const fill = circ - (score / 100) * circ
  const c = scoreColor(score)
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" style={{ flexShrink: 0 }}>
      <circle cx="19" cy="19" r={r} fill="none" stroke="var(--border)" strokeWidth="2.5" />
      <circle cx="19" cy="19" r={r} fill="none" stroke={c}
        strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round" transform="rotate(-90 19 19)" />
      <text x="19" y="23" textAnchor="middle" fill={c} fontSize="8" fontWeight="700" fontFamily="monospace">{score}</text>
    </svg>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function RunRow({ run, onDelete }: { run: RecentRun; onDelete: () => void }) {
  return (
    <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.2s' }}>
      <ArcScore score={run.topScore} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{run.jobTitle}</span>
          <span className="tag">{run.company}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{timeAgo(run.runDate)}</span>
          <span>·</span>
          <span>{run.count} ranked</span>
          <span>·</span>
          <span>Top <span style={{ color: scoreColor(run.topScore), fontWeight: 600 }}>{run.topScore}</span></span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Link href={`/screening/${run.jobId}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
          View →
        </Link>
        <button onClick={onDelete} className="btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}>✕</button>
      </div>
    </div>
  )
}

export default function ScreeningHubPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [runs, setRuns] = useState<RecentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [candMap, setCandMap] = useState<Record<string, number>>({})
  const [showNewModal, setShowNewModal] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [jobsRes, cntRes] = await Promise.all([
        jobsAPI.list(),
        candidatesAPI.countByJob().catch(() => ({ data: { data: {} } })),
      ])
      const jobList: Job[] = jobsRes.data.data || []
      setJobs(jobList)
      const cm: Record<string, number> = {}
      const cntData = cntRes.data.data || {}
      for (const [k, v] of Object.entries(cntData)) cm[k] = (v as any).count || 0
      setCandMap(cm)
      const runData: RecentRun[] = []
      await Promise.allSettled(jobList.map(async (job) => {
        try {
          const r = await screeningAPI.results(job._id)
          if (r.data?.data?.results?.length) {
            const results = r.data.data.results
            runData.push({
              jobId: job._id, jobTitle: job.title, company: job.company, location: job.location,
              runDate: r.data.data.runDate, count: results.length,
              topScore: results[0]?.score?.totalScore || 0, screeningRunId: r.data.data.screeningRunId,
            })
          }
        } catch {}
      }))
      runData.sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime())
      setRuns(runData)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filteredRuns = useMemo(() => {
    const s = search.toLowerCase()
    if (!s) return runs
    return runs.filter(r => r.jobTitle.toLowerCase().includes(s) || r.company.toLowerCase().includes(s))
  }, [runs, search])

  return (
    <>
      <div style={{ padding: '32px 32px 80px', maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              AI Screening
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {runs.length > 0
                ? `${runs.length} run${runs.length !== 1 ? 's' : ''} · ${runs.reduce((a, r) => a + r.count, 0)} candidates ranked`
                : 'AI-powered candidate ranking'}
            </p>
          </div>
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Screening
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 70, borderRadius: 10 }} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 40px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
              background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9" stroke="#00C896" strokeWidth="1.4" />
                <path d="M7.5 11l2.5 2.5 4.5-5" stroke="#00C896" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No screenings yet</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              Start your first AI screening to rank and evaluate candidates
            </p>
            <button onClick={() => setShowNewModal(true)} className="btn-primary">
              Start First Screening
            </button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="var(--text-muted)" strokeWidth="1.2" />
                <path d="M9 9l2.5 2.5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search screenings…" className="input" style={{ paddingLeft: 34 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p className="section-label">Recent Runs</p>
              <span className="section-label">{filteredRuns.length} result{filteredRuns.length !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredRuns.map(run => (
                <RunRow key={run.jobId} run={run} onDelete={() => {
                  setRuns(r => r.filter(x => x.jobId !== run.jobId))
                  toast.success('Removed')
                }} />
              ))}
              {filteredRuns.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No results match your search
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showNewModal && <NewScreeningModal jobs={jobs} candMap={candMap} onClose={() => setShowNewModal(false)} />}
    </>
  )
}