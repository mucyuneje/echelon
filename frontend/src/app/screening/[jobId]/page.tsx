'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { jobsAPI, candidatesAPI, screeningAPI } from '@/lib/api'
import { Job, Candidate, ScreeningResultItem } from '@/types'
import ScoreRing from '@/components/ui/ScoreRing'
import toast from 'react-hot-toast'
import Link from 'next/link'
import UploadModal from '@/components/candidates/UploadModal'

type Phase = 'idle' | 'running' | 'done'

const FIT_STYLE = {
  'Strong Fit': { bg: 'rgba(0,200,150,0.1)', text: '#059669', border: 'rgba(0,200,150,0.25)', dot: '#00C896' },
  'Good Fit':   { bg: 'rgba(37,99,235,0.1)',  text: '#2563EB', border: 'rgba(37,99,235,0.25)',  dot: '#2563EB' },
  'Partial Fit':{ bg: 'rgba(245,158,11,0.1)', text: '#D97706', border: 'rgba(245,158,11,0.25)', dot: '#F59E0B' },
  'Poor Fit':   { bg: 'rgba(239,68,68,0.1)',  text: '#DC2626', border: 'rgba(239,68,68,0.25)',  dot: '#EF4444' },
} as const

const STEPS = [
  'Initializing AI engine', 'Fetching candidates', 'Computing match scores',
  'Evaluating skill alignment', 'Ranking candidates', 'Generating insights',
]

function reRankByScore(items: ScreeningResultItem[]): ScreeningResultItem[] {
  return [...items]
    .sort((a, b) => (b.score?.totalScore || 0) - (a.score?.totalScore || 0))
    .map((item, i) => ({ ...item, rank: i + 1 }))
}

function useSoundFX() {
  const ctx = useRef<AudioContext | null>(null)
  const getCtx = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return ctx.current
  }
  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.1) => {
    try {
      const c = getCtx(); const osc = c.createOscillator(); const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.type = type; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, c.currentTime)
      gain.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
      osc.start(c.currentTime); osc.stop(c.currentTime + duration)
    } catch {}
  }, [])
  return {
    boot: () => { playTone(80, 0.3, 'sawtooth', 0.05); setTimeout(() => playTone(1200, 0.15, 'square', 0.04), 200) },
    tick: () => playTone(880, 0.06, 'square', 0.03),
    complete: () => [261, 329, 392, 523].forEach((f, i) => setTimeout(() => playTone(f, 0.5, 'sine', 0.07), i * 80)),
  }
}

/* PDF Export */
async function loadJsPDF(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf?.jsPDF) { resolve((window as any).jspdf.jsPDF); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve((window as any).jspdf.jsPDF)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function exportToPDF(job: Job | null, results: ScreeningResultItem[]) {
  if (!job) return
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 18

  const fitColor = (fit: string): [number, number, number] => {
    if (fit === 'Strong Fit') return [0, 150, 100]
    if (fit === 'Good Fit')   return [37, 99, 235]
    if (fit === 'Poor Fit')   return [220, 38, 38]
    return [217, 119, 6]
  }

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, 210, 297, 'F')
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, 4, 297, 'F')

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22); doc.setFont('helvetica', 'bold')
  doc.text('AI Screening Report', M, 32)
  doc.setFontSize(14); doc.setTextColor(71, 85, 105)
  doc.text(job.title, M, 44)
  doc.setFontSize(11); doc.setTextColor(148, 163, 184)
  doc.text(`${job.company}${job.location ? ' · ' + job.location : ''}`, M, 52)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, M, 59)

  doc.setFillColor(241, 245, 249)
  doc.roundedRect(M, 68, W - M * 2, 22, 3, 3, 'F')
  const stats = [
    { label: 'Shortlisted', val: String(results.length) },
    { label: 'Top Score', val: String(results[0]?.score?.totalScore || 0) },
    { label: 'Avg Score', val: String(results.length ? Math.round(results.reduce((a, r) => a + (r.score?.totalScore || 0), 0) / results.length) : 0) },
  ]
  stats.forEach((s, i) => {
    const x = M + 10 + i * 56
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
    doc.text(s.val, x, 80)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184)
    doc.text(s.label, x, 85)
  })

  let y = 102
  results.forEach((r) => {
    if (y > 250) {
      doc.addPage()
      doc.setFillColor(248, 250, 252); doc.rect(0, 0, 210, 297, 'F')
      doc.setFillColor(37, 99, 235); doc.rect(0, 0, 4, 297, 'F')
      y = 20
    }
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(M, y, W - M * 2, 32, 3, 3, 'F')
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3)
    doc.roundedRect(M, y, W - M * 2, 32, 3, 3, 'S')

    const rc: [number, number, number] = r.rank === 1 ? [245, 158, 11] : r.rank === 2 ? [148, 163, 184] : r.rank === 3 ? [176, 141, 87] : [203, 213, 225]
    doc.setFillColor(...rc); doc.circle(M + 8, y + 8, 5, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text(String(r.rank), M + 8, y + 10, { align: 'center' })

    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42)
    doc.text(r.candidateName || 'Unknown', M + 18, y + 9)
    const fc = fitColor(r.insight?.fitForRole || 'Partial Fit')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...fc)
    doc.text(r.insight?.fitForRole || 'Partial Fit', M + 18, y + 14)
    if (r.candidateHeadline) {
      doc.setFontSize(8); doc.setTextColor(100, 116, 139)
      doc.text(r.candidateHeadline.slice(0, 65), M + 18, y + 20)
    }
    const sc = r.score?.totalScore || 0
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
    doc.text(String(sc), W - M - 8, y + 12, { align: 'right' })
    doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal')
    doc.text('score', W - M - 8, y + 18, { align: 'right' })
    y += 36
  })

  doc.save(`screening-${job.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
  toast.success('PDF exported')
}

/* Running overlay */
function RunningOverlay({ progress }: { progress: number }) {
  const stepIdx = Math.min(Math.floor((progress / 100) * STEPS.length), STEPS.length - 1)
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', padding: '32px 0' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
            <svg style={{ position: 'absolute', inset: 0, animation: 'spin 3s linear infinite' }} width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--border)" strokeWidth="2" />
              <path d="M24 4 A20 20 0 0 1 44 24" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#00C896' }}>{Math.round(progress)}%</span>
            </div>
          </div>
          <div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Running AI Screening</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>Powered by Gemini</p>
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', borderRadius: 2, background: '#00C896', width: `${progress}%`, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STEPS.map((step, i) => {
            const done = i < stepIdx, active = i === stepIdx
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i > stepIdx ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                <div style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="rgba(0,200,150,0.15)" stroke="rgba(0,200,150,0.4)" />
                      <path d="M4.5 7l2 2 3.5-3.5" stroke="#00C896" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : active ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} className="animate-pulse-dot" />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border)' }} />
                  )}
                </div>
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step}</p>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/* Result card */
function ResultCard({ result, index }: { result: ScreeningResultItem; index: number }) {
  const [open, setOpen] = useState(index < 3)
  const fit = FIT_STYLE[result.insight?.fitForRole as keyof typeof FIT_STYLE] || FIT_STYLE['Partial Fit']
  const initials = (result.candidateName || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const scores = [
    { label: 'Skills', val: result.score?.skillScore || 0 },
    { label: 'Exp', val: result.score?.experienceScore || 0 },
    { label: 'Projects', val: result.score?.projectScore || 0 },
    { label: 'Education', val: result.score?.educationScore || 0 },
    { label: 'Certs', val: result.score?.certificationScore || 0 },
  ]

  const rankBg = result.rank === 1 ? 'rgba(245,158,11,0.12)' : result.rank === 2 ? 'rgba(148,163,184,0.1)' : result.rank === 3 ? 'rgba(176,141,87,0.1)' : 'var(--bg)'
  const rankColor = result.rank === 1 ? '#D97706' : result.rank === 2 ? '#64748B' : result.rank === 3 ? '#92400E' : 'var(--text-muted)'
  const rankBorder = result.rank <= 3
    ? `1px solid ${['rgba(245,158,11,0.3)', 'rgba(148,163,184,0.2)', 'rgba(176,141,87,0.2)'][result.rank - 1]}`
    : '1px solid var(--border)'

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      borderColor: result.rank === 1 ? 'rgba(245,158,11,0.25)' : undefined,
      animation: `cardIn 0.4s ease ${index * 50}ms both`,
    }}>
      {/* ── Header row (always visible) ── */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer',
      }}>
        {/* Rank badge */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
          background: rankBg, color: rankColor, border: rankBorder,
        }}>{result.rank}</div>

        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, background: 'var(--umu-blue-bg)', color: 'var(--umu-blue)',
          border: '1px solid var(--umu-blue-faint)',
        }}>{initials}</div>

        {/* Name + fit badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{result.candidateName || 'Unknown'}</span>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 20,
              background: fit.bg, color: fit.text, border: `1px solid ${fit.border}`,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: fit.dot }} />
              {result.insight?.fitForRole || 'Partial Fit'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {result.candidateHeadline || '—'}
          </p>
        </div>

        {/* Score ring — fixed: text rendered outside SVG as a div overlay */}
        <ScoreRing score={result.score?.totalScore || 0} size={42} strokeWidth={3} />

        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4.5L6 8l4-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>

      {/* ── Expanded detail (only when open) ── */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>

            {/* Score bars */}
            <div style={{ gridColumn: '1 / -1' }}>
              <p className="section-label" style={{ marginBottom: 10 }}>Score Breakdown</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {scores.map(({ label, val }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{
                      height: 48, borderRadius: 8, background: 'var(--bg)', overflow: 'hidden',
                      display: 'flex', alignItems: 'flex-end', marginBottom: 4, position: 'relative',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: '100%', borderRadius: 8,
                        background: val >= 70 ? 'rgba(0,200,150,0.4)' : val >= 50 ? 'rgba(37,99,235,0.4)' : 'rgba(245,158,11,0.4)',
                        height: `${val}%`,
                      }} />
                      <span style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                        color: val >= 70 ? '#059669' : val >= 50 ? '#2563EB' : '#D97706',
                      }}>{val}</span>
                    </div>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            {result.insight?.strengths?.length > 0 && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)' }}>
                <p style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', marginBottom: 8 }}>Strengths</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {result.insight.strengths.slice(0, 3).map((s: string, i: number) => (
                    <li key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#059669', fontWeight: 700, flexShrink: 0 }}>+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {result.insight?.gaps?.length > 0 && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p style={{ fontSize: 9, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', marginBottom: 8 }}>Gaps</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {result.insight.gaps.slice(0, 3).map((g: string, i: number) => (
                    <li key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#D97706', flexShrink: 0 }}>△</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            {result.insight?.recommendation && (
              <div style={{ gridColumn: '1 / -1', padding: 12, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p className="section-label" style={{ marginBottom: 6 }}>AI Recommendation</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.insight.recommendation}</p>
              </div>
            )}

            {/* Footer meta */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' as const }}>
              {result.candidateLocation && <span>📍 {result.candidateLocation}</span>}
              {result.features?.totalYearsExperience > 0 && <span>{result.features.totalYearsExperience}y exp</span>}
              {result.features?.seniorityLevel && result.features.seniorityLevel !== 'Unknown' && <span>{result.features.seniorityLevel}</span>}
            </div>

          </div>
        </div>
      )}

      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

export default function ScreeningResultsPage() {
  const { jobId } = useParams() as { jobId: string }
  const searchParams = useSearchParams()
  const autoRun = searchParams.get('autoRun') === '1'
  const autoTopN = Number(searchParams.get('topN') || 20)

  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [results, setResults] = useState<ScreeningResultItem[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [topN, setTopN] = useState(autoTopN)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [prevRunDate, setPrevRunDate] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const sfx = useSoundFX()
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [jobRes, candRes, prevRes] = await Promise.all([
        jobsAPI.get(jobId),
        candidatesAPI.list({ jobId, limit: 200 }),
        screeningAPI.results(jobId).catch(() => null),
      ])
      setJob(jobRes.data.data)
      setCandidates(candRes.data.data || [])
      if (prevRes?.data?.data?.results?.length) {
        const raw = prevRes.data.data.results
        const normalized: ScreeningResultItem[] = raw.map((r: any) => {
          const cand = r.candidateId
          if (cand && typeof cand === 'object') {
            return {
              rank: r.rank, candidateId: cand._id || r.candidateId, resultId: r._id,
              candidateName: `${cand.profile?.firstName || ''} ${cand.profile?.lastName || ''}`.trim() || r.candidateName || 'Unknown',
              candidateEmail: cand.profile?.email || r.candidateEmail || '',
              candidateHeadline: cand.profile?.headline || r.candidateHeadline || '',
              candidateLocation: cand.profile?.location || r.candidateLocation || '',
              score: r.score || { totalScore: 0, skillScore: 0, experienceScore: 0, projectScore: 0, educationScore: 0, certificationScore: 0 },
              insight: r.insight || { fitForRole: 'Partial Fit', strengths: [], gaps: [], recommendation: '', confidence: 0.7 },
              features: cand.features || r.features || {}, source: cand.source || r.source || '',
            }
          }
          return {
            ...r,
            candidateName: r.candidateName || 'Unknown',
            score: r.score || { totalScore: 0, skillScore: 0, experienceScore: 0, projectScore: 0, educationScore: 0, certificationScore: 0 },
            insight: r.insight || { fitForRole: 'Partial Fit', strengths: [], gaps: [], recommendation: '', confidence: 0.7 },
          }
        })
        setResults(reRankByScore(normalized))
        setPrevRunDate(prevRes.data.data.runDate)
        setPhase('done')
      }
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!loading && autoRun && phase === 'idle' && candidates.length > 0) runScreening()
  }, [loading, autoRun, phase, candidates.length])

  const runScreening = async () => {
    if (candidates.length === 0) { toast.error('No candidates for this job'); return }
    setPhase('running'); setProgress(0); setResults([])
    sfx.boot()
    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 8
      if (p >= 92) { clearInterval(progressRef.current!); p = 92 }
      setProgress(p)
      if (Math.floor(p / 15) > Math.floor((p - 8) / 15)) sfx.tick()
    }, 600)
    try {
      const res = await screeningAPI.run(jobId, topN)
      clearInterval(progressRef.current!); setProgress(100)
      const data = res.data.data
      const normalized: ScreeningResultItem[] = (data.results || []).map((r: any) => ({
        rank: r.rank, candidateId: r.candidateId, resultId: r.resultId,
        candidateName: r.candidateName || 'Unknown',
        candidateEmail: r.candidateEmail || '', candidateHeadline: r.candidateHeadline || '',
        candidateLocation: r.candidateLocation || '',
        score: r.score || { totalScore: 0, skillScore: 0, experienceScore: 0, projectScore: 0, educationScore: 0, certificationScore: 0 },
        insight: r.insight || { fitForRole: 'Partial Fit', strengths: [], gaps: [], recommendation: '', confidence: 0.7 },
        features: r.features || {}, source: r.source || '',
      }))
      sfx.complete()
      setTimeout(() => { setResults(reRankByScore(normalized)); setPhase('done'); setPrevRunDate(new Date().toISOString()) }, 400)
    } catch (err: any) {
      clearInterval(progressRef.current!); setPhase('idle'); setProgress(0)
      toast.error(err.response?.data?.message || 'Screening failed')
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try { await exportToPDF(job, results) }
    catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const avgScore = results.length
    ? Math.round(results.reduce((a, r) => a + (r.score?.totalScore || 0), 0) / results.length)
    : 0

  if (loading) return (
    <div style={{ padding: '32px', maxWidth: 800, margin: '0 auto' }}>
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 70, borderRadius: 10, marginBottom: 8 }} />
      ))}
    </div>
  )

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 800, margin: '0 auto' }}>

      {/* Back */}
      <Link href="/screening" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20,
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        All Screenings
      </Link>

      {/* Job header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{job?.title || '…'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {job?.company}{job?.location ? ` · ${job.location}` : ''}
          </p>
          {prevRunDate && phase === 'done' && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
              Last run {new Date(prevRunDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {phase === 'done' && results.length > 0 && (
            <button onClick={handleExport} disabled={exporting} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          )}
          <button onClick={() => setUploadOpen(true)} className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add Candidates
          </button>
        </div>
      </div>

      {/* Requirements */}
      {job?.structuredRequirements && (
        <div style={{ borderRadius: 10, padding: '12px 14px', marginBottom: 20, background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
            <span className="section-label">Requirements</span>
            <span className="tag-green">{job.structuredRequirements.minExperienceYears}+ yrs · {job.structuredRequirements.educationLevel}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
            {job.structuredRequirements.requiredSkills?.slice(0, 8).map((s: string) => (
              <span key={s} className="tag-green" style={{ fontSize: 10 }}>{s}</span>
            ))}
            {(job.structuredRequirements.requiredSkills?.length || 0) > 8 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{job.structuredRequirements.requiredSkills.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {phase !== 'running' && (
        <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Top</span>
            <select value={topN} onChange={e => setTopN(Number(e.target.value))} className="input" style={{ width: 'auto', padding: '4px 8px', height: 32 }}>
              {[10,20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {candidates.length} candidates</span>
          </div>
          <button onClick={runScreening} disabled={candidates.length === 0} className="btn-primary" style={{ marginLeft: 'auto' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 6.5l1.5 1.5L9.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {phase === 'done' ? 'Re-run Screening' : 'Run AI Screening'}
          </button>
        </div>
      )}

      {phase === 'running' && <RunningOverlay progress={progress} />}

      {phase === 'done' && results.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Analyzed', val: candidates.length, color: 'var(--text-primary)' },
              { label: 'Shortlisted', val: results.length, color: '#059669' },
              { label: 'Avg Score', val: avgScore, color: 'var(--umu-blue)' },
            ].map(s => (
              <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: s.color, marginBottom: 2 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => <ResultCard key={r.candidateId + i} result={r} index={i} />)}
          </div>
        </>
      )}

      {phase === 'idle' && candidates.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px', background: 'var(--umu-blue-bg)', border: '1px solid var(--umu-blue-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="var(--umu-blue)" strokeWidth="1.3" />
              <path d="M7 10l2.5 2.5 4-4" stroke="var(--umu-blue)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Ready to screen</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{candidates.length} candidates · click Run AI Screening above</p>
        </div>
      )}

      {phase === 'idle' && candidates.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>No candidates assigned to this job yet</p>
          <button onClick={() => setUploadOpen(true)} className="btn-primary">Upload Candidates</button>
        </div>
      )}

      {uploadOpen && <UploadModal preselectedJobId={jobId} onClose={() => { setUploadOpen(false); load() }} />}
    </div>
  )
}