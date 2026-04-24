'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { jobsAPI, candidatesAPI, screeningAPI } from '@/lib/api'
import { Job, Candidate, ScreeningResultItem, ScreeningStats } from '@/types'
import ScoreRing from '@/components/ui/ScoreRing'
import toast from 'react-hot-toast'
import Link from 'next/link'
import UploadModal from '@/components/candidates/UploadModal'



type Phase = 'idle' | 'running' | 'done'

const FIT_STYLE = {
  'Strong Fit': { bg: 'rgba(0,200,150,0.1)', text: '#059669', border: 'rgba(0,200,150,0.25)', dot: '#00C896' },
  'Good Fit': { bg: 'rgba(37,99,235,0.1)', text: '#2563EB', border: 'rgba(37,99,235,0.25)', dot: '#2563EB' },
  'Partial Fit': { bg: 'rgba(245,158,11,0.1)', text: '#D97706', border: 'rgba(245,158,11,0.25)', dot: '#F59E0B' },
  'Poor Fit': { bg: 'rgba(239,68,68,0.1)', text: '#DC2626', border: 'rgba(239,68,68,0.25)', dot: '#EF4444' },
} as const

const STEPS = [
  'Initializing AI engine', 'Fetching candidates', 'Computing match scores',
  'Evaluating skill alignment', 'Ranking candidates', 'Generating insights',
]

// ─── Re-rank ─────────────────────────────────────────────────────────────────
function reRankByScore(items: ScreeningResultItem[]): ScreeningResultItem[] {
  return [...items]
    .sort((a, b) => (b.score?.totalScore ?? 0) - (a.score?.totalScore ?? 0))
    .map((item, i) => ({ ...item, rank: i + 1 }))
}

// ─── Normalise raw API result → ScreeningResultItem ──────────────────────────
// Handles BOTH the GET /results path (candidateId is a populated object, doc _id
// is the result's _id) and the POST /run path (flat, resultId already present).
function normalise(r: any): ScreeningResultItem {
  const cand = r.candidateId && typeof r.candidateId === 'object' ? r.candidateId : null

  // resultId: POST /run sends r.resultId; GET /results document _id is r._id
  const resultId: string | undefined =
    r.resultId ?? r._id ?? r.id ?? r.result?._id ?? r.result?.id ?? undefined

  return {
    rank: r.rank ?? 0,
    candidateId: cand?._id ?? (typeof r.candidateId === 'string' ? r.candidateId : '') ?? '',
    resultId,
    candidateName: (cand
      ? `${cand.profile?.firstName ?? ''} ${cand.profile?.lastName ?? ''}`.trim()
      : '') || r.candidateName || 'Unknown',
    candidateEmail: cand?.profile?.email ?? r.candidateEmail ?? '',
    candidateHeadline: cand?.profile?.headline ?? r.candidateHeadline ?? '',
    candidateLocation: cand?.profile?.location ?? r.candidateLocation ?? '',
    score: r.score ?? {
      totalScore: 0, skillScore: 0, experienceScore: 0,
      projectScore: 0, educationScore: 0, certificationScore: 0,
    },
    insight: r.insight ?? {
      fitForRole: 'Partial Fit', strengths: [], gaps: [],
      recommendation: '', confidence: 0.7,
    },
    features: cand?.features ?? r.features ?? {},
    source: cand?.source ?? r.source ?? '',
  }
}

// ─── Sound FX ────────────────────────────────────────────────────────────────
function useSoundFX() {
  const ctx = useRef<AudioContext | null>(null)
  const getCtx = () => {
    if (!ctx.current)
      ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return ctx.current
  }
  const tone = useCallback(
    (freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.1) => {
      try {
        const c = getCtx(), osc = c.createOscillator(), gain = c.createGain()
        osc.connect(gain); gain.connect(c.destination)
        osc.type = type; osc.frequency.value = freq
        gain.gain.setValueAtTime(0, c.currentTime)
        gain.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
        osc.start(c.currentTime); osc.stop(c.currentTime + dur)
      } catch { }
    },
    [],
  )
  return {
    boot: () => { tone(80, 0.3, 'sawtooth', 0.05); setTimeout(() => tone(1200, 0.15, 'square', 0.04), 200) },
    tick: () => tone(880, 0.06, 'square', 0.03),
    complete: () => [261, 329, 392, 523].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.07), i * 80)),
  }
}

// ─── PDF export ───────────────────────────────────────────────────────────────
async function loadJsPDF(): Promise<any> {
  return new Promise((res, rej) => {
    if ((window as any).jspdf?.jsPDF) { res((window as any).jspdf.jsPDF); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s.onload = () => res((window as any).jspdf.jsPDF)
    s.onerror = rej
    document.head.appendChild(s)
  })
}

async function exportToPDF(
  job: Job | null,
  results: ScreeningResultItem[],
  stats: ScreeningStats | null,
) {
  if (!job) return
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 14, R = 196

  // Palette
  const BLUE: [number, number, number] = [37, 99, 235]
  const GREEN: [number, number, number] = [5, 150, 105]
  const AMBER: [number, number, number] = [217, 119, 6]
  const RED: [number, number, number] = [220, 38, 38]
  const S900: [number, number, number] = [15, 23, 42]
  const S600: [number, number, number] = [71, 85, 105]
  const S400: [number, number, number] = [148, 163, 184]
  const S100: [number, number, number] = [241, 245, 249]
  const WHITE: [number, number, number] = [255, 255, 255]
  const BG: [number, number, number] = [248, 250, 252]

  const fitCol = (f: string): [number, number, number] =>
    f === 'Strong Fit' ? GREEN : f === 'Good Fit' ? BLUE : f === 'Poor Fit' ? RED : AMBER
  const rankCol = (rank: number): [number, number, number] =>
    rank === 1 ? [245, 158, 11] : rank === 2 ? [148, 163, 184] : rank === 3 ? [176, 141, 87] : S400

  // Page chrome (bg + accent bar + footer)
  const chrome = () => {
    doc.setFillColor(...BG); doc.rect(0, 0, W, 297, 'F')
    doc.setFillColor(...BLUE); doc.rect(0, 0, 3, 297, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S400)
    doc.text(`${job.title} · AI Screening Report`, M, 291)
    doc.text(
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      R, 291, { align: 'right' },
    )
  }

  // ── PAGE 1: Cover + summary table ────────────────────────────────────────
  chrome()

  // Hero banner
  doc.setFillColor(...BLUE); doc.roundedRect(M, 18, W - M * 2, 40, 3, 3, 'F')
  doc.setFontSize(19); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
  doc.text('AI Screening Report', M + 10, 32)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 210, 255)
  doc.text(job.title, M + 10, 40)
  doc.setFontSize(8); doc.setTextColor(150, 185, 255)
  doc.text(
    `${job.company}${job.location ? ' · ' + job.location : ''}  ·  ` +
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    M + 10, 50,
  )

  // Stats strip
  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + (r.score?.totalScore ?? 0), 0) / results.length) : 0
  const cells = [
    { label: 'Shortlisted', val: String(results.length), color: GREEN },
    { label: 'Top Score', val: String(results[0]?.score?.totalScore ?? 0), color: AMBER },
    { label: 'Avg Score', val: String(avg), color: BLUE },
    { label: 'Strong Fits', val: String(stats?.fitDistribution?.['Strong Fit'] ?? 0), color: GREEN },
    { label: 'Confidence', val: stats ? `${Math.round((stats.avgConfidence ?? 0.7) * 100)}%` : '—', color: BLUE },
    { label: 'Good Fits', val: String(stats?.fitDistribution?.['Good Fit'] ?? 0), color: S400 },
  ]
  const cw = (W - M * 2) / 6
  doc.setFillColor(...WHITE); doc.roundedRect(M, 66, W - M * 2, 19, 2, 2, 'F')
  cells.forEach(({ label, val, color }, i) => {
    const x = M + i * cw
    if (i > 0) { doc.setDrawColor(...S100); doc.setLineWidth(0.2); doc.line(x, 68, x, 83) }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(val, x + cw / 2, 77.5, { align: 'center' })
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S400)
    doc.text(label, x + cw / 2, 82.5, { align: 'center' })
  })

  // Fit distribution bar
  if (stats?.fitDistribution) {
    const fits = [
      { k: 'Strong Fit', c: GREEN }, { k: 'Good Fit', c: BLUE },
      { k: 'Partial Fit', c: AMBER }, { k: 'Poor Fit', c: RED },
    ]
    const total = Object.values(stats.fitDistribution).reduce((a, b) => a + b, 0)
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S400)
    doc.text('FIT DISTRIBUTION', M, 94)
    let bx = M, barY = 96, bw = W - M * 2
    fits.forEach(({ k, c }) => {
      const cnt = stats.fitDistribution[k] ?? 0
      const seg = total > 0 ? (cnt / total) * bw : 0
      if (seg > 0) { doc.setFillColor(...c); doc.rect(bx, barY, seg, 4, 'F'); bx += seg }
    })
    doc.setDrawColor(...S100); doc.setLineWidth(0.2); doc.rect(M, barY, bw, 4, 'S')
    let lx = M
    fits.forEach(({ k, c }) => {
      const cnt = stats.fitDistribution[k] ?? 0; if (!cnt) return
      doc.setFillColor(...c); doc.circle(lx + 2, barY + 10, 1.5, 'F')
      doc.setFontSize(6.5); doc.setTextColor(...S600)
      doc.text(`${cnt} ${k}`, lx + 5, barY + 11); lx += 38
    })
  }

  // Requirements
  if (job.structuredRequirements) {
    const req = job.structuredRequirements, ry = 115
    doc.setFillColor(...WHITE); doc.roundedRect(M, ry, W - M * 2, 28, 2, 2, 'F')
    doc.setDrawColor(...S100); doc.setLineWidth(0.2); doc.roundedRect(M, ry, W - M * 2, 28, 2, 2, 'S')
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S400)
    doc.text('REQUIREMENTS', M + 5, ry + 6)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
    doc.text(`${req.minExperienceYears}+ years  ·  ${req.educationLevel}`, M + 5, ry + 13)
    const skills: string[] = req.requiredSkills ?? []
    doc.setFontSize(7); doc.setTextColor(...S600)
    doc.text(skills.slice(0, 9).join('  ·  '), M + 5, ry + 20, { maxWidth: W - M * 2 - 10 })
    if (skills.length > 9) { doc.setTextColor(...S400); doc.text(`+${skills.length - 9} more`, M + 5, ry + 26) }
  }

  // Summary table
  let ty = 152
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S400)
  doc.text('CANDIDATE SHORTLIST', M, ty); ty += 4

  // Column x positions — tighter, fit on A4
  const C = { rank: M, name: M + 9, fit: M + 63, total: M + 98, sk: M + 111, exp: M + 124, pj: M + 137, ed: M + 150, ce: M + 163 }
  const headers = ['#', 'Candidate', 'Fit', 'Total', 'Skills', 'Exp', 'Proj', 'Edu', 'Certs']
  const xs = Object.values(C)

  doc.setFillColor(...BLUE); doc.rect(M, ty, W - M * 2, 6.5, 'F')
  doc.setFontSize(5.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
  headers.forEach((h, i) => doc.text(h, xs[i] + 1, ty + 4.3))
  ty += 6.5

  results.forEach((r, i) => {
    if (ty > 278) return
    doc.setFillColor(...(i % 2 === 0 ? WHITE : S100)); doc.rect(M, ty, W - M * 2, 6, 'F')
    if (r.rank <= 3) { doc.setFillColor(...rankCol(r.rank)); doc.rect(M, ty, 2, 6, 'F') }

    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...rankCol(r.rank))
    doc.text(String(r.rank), C.rank + 1, ty + 4)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...S900)
    doc.text((r.candidateName || 'Unknown').slice(0, 21), C.name + 1, ty + 4)
    doc.setTextColor(...fitCol(r.insight?.fitForRole || 'Partial Fit'))
    doc.text((r.insight?.fitForRole || '—').replace(' Fit', ''), C.fit + 1, ty + 4)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE)
    doc.text(String(r.score?.totalScore ?? 0), C.total + 1, ty + 4)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
    doc.text(String(r.score?.skillScore ?? 0), C.sk + 1, ty + 4)
    doc.text(String(r.score?.experienceScore ?? 0), C.exp + 1, ty + 4)
    doc.text(String(r.score?.projectScore ?? 0), C.pj + 1, ty + 4)
    doc.text(String(r.score?.educationScore ?? 0), C.ed + 1, ty + 4)
    doc.text(String(r.score?.certificationScore ?? 0), C.ce + 1, ty + 4)
    ty += 6
  })

  // ── PAGES 2+: One candidate per page ─────────────────────────────────────
  results.forEach((r, idx) => {
    doc.addPage(); chrome()
    let y = 20

    // Header
    const rc = rankCol(r.rank)
    const isTop = r.rank <= 3
    doc.setFillColor(...(isTop ? rc.map(v => Math.min(255, v + 210)) as [number, number, number] : S100))
    doc.roundedRect(M, y, W - M * 2, 24, 3, 3, 'F')
    if (isTop) { doc.setDrawColor(...rc); doc.setLineWidth(0.35); doc.roundedRect(M, y, W - M * 2, 24, 3, 3, 'S') }

    // Rank circle
    doc.setFillColor(...rc); doc.circle(M + 7, y + 12, 5, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text(String(r.rank), M + 7, y + 14.5, { align: 'center' })

    // Name + fit badge
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S900)
    doc.text(r.candidateName || 'Unknown', M + 16, y + 9)
    const fc = fitCol(r.insight?.fitForRole || 'Partial Fit')
    doc.setFillColor(...fc.map(v => Math.min(255, v + 215)) as [number, number, number])
    doc.roundedRect(M + 16, y + 11, 26, 5.5, 2, 2, 'F')
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...fc)
    doc.text(r.insight?.fitForRole || '—', M + 29, y + 15.2, { align: 'center' })

    // Headline
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
    doc.text((r.candidateHeadline || '').slice(0, 65), M + 16, y + 21)

    // Total score
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE)
    doc.text(String(r.score?.totalScore ?? 0), R, y + 13, { align: 'right' })
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S400)
    doc.text('/100', R, y + 19, { align: 'right' })

    y += 30

    // Score breakdown — horizontal bars
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S400)
    doc.text('SCORE BREAKDOWN', M, y); y += 4

    const bars = [
      { label: 'Skills Match', val: r.score?.skillScore ?? 0, color: [37, 99, 235] as [number, number, number] },
      { label: 'Experience', val: r.score?.experienceScore ?? 0, color: [245, 158, 11] as [number, number, number] },
      { label: 'Projects', val: r.score?.projectScore ?? 0, color: [129, 140, 248] as [number, number, number] },
      { label: 'Education', val: r.score?.educationScore ?? 0, color: [244, 114, 182] as [number, number, number] },
      { label: 'Certifications', val: r.score?.certificationScore ?? 0, color: [52, 211, 153] as [number, number, number] },
    ]
    bars.forEach(({ label, val, color }) => {
      const bw = W - M * 2 - 34, filled = (val / 100) * bw
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
      doc.text(label, M, y + 3.5)
      doc.setFillColor(...S100); doc.roundedRect(M + 36, y, bw, 4, 2, 2, 'F')
      if (filled > 0) { doc.setFillColor(...color); doc.roundedRect(M + 36, y, filled, 4, 2, 2, 'F') }
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S900)
      doc.text(String(val), R, y + 3.5, { align: 'right' })
      y += 7.5
    })
    y += 3

    // Strengths + Gaps side by side
    const colW = (W - M * 2 - 6) / 2, boxH = 44
    // Strengths
    doc.setFillColor(240, 253, 250); doc.roundedRect(M, y, colW, boxH, 2, 2, 'F')
    doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.2); doc.roundedRect(M, y, colW, boxH, 2, 2, 'S')
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    doc.text('STRENGTHS', M + 4, y + 6)
      ; (r.insight?.strengths ?? []).slice(0, 4).forEach((s: string, i: number) => {
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
        doc.text(doc.splitTextToSize(`+ ${s}`, colW - 8)[0], M + 4, y + 13 + i * 8)
      })
    // Gaps
    const gx = M + colW + 6
    doc.setFillColor(255, 251, 235); doc.roundedRect(gx, y, colW, boxH, 2, 2, 'F')
    doc.setDrawColor(253, 230, 138); doc.setLineWidth(0.2); doc.roundedRect(gx, y, colW, boxH, 2, 2, 'S')
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AMBER)
    doc.text('GAPS', gx + 4, y + 6)
      ; (r.insight?.gaps ?? []).slice(0, 4).forEach((g: string, i: number) => {
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
        doc.text(doc.splitTextToSize(`△ ${g}`, colW - 8)[0], gx + 4, y + 13 + i * 8)
      })
    if (!(r.insight?.gaps ?? []).length) {
      doc.setFontSize(7.5); doc.setTextColor(...S400); doc.text('No significant gaps', gx + 4, y + 13)
    }
    y += boxH + 5

    // Recommendation
    if (r.insight?.recommendation) {
      doc.setFillColor(...WHITE); doc.roundedRect(M, y, W - M * 2, 24, 2, 2, 'F')
      doc.setDrawColor(...S100); doc.setLineWidth(0.2); doc.roundedRect(M, y, W - M * 2, 24, 2, 2, 'S')
      doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...S400)
      doc.text('AI RECOMMENDATION', M + 5, y + 5.5)
      doc.setTextColor(...BLUE)
      doc.text(`${Math.round((r.insight?.confidence ?? 0.7) * 100)}% confidence`, R, y + 5.5, { align: 'right' })
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S600)
      doc.text(doc.splitTextToSize(r.insight.recommendation, W - M * 2 - 10).slice(0, 2), M + 5, y + 12)
      y += 28
    }

    // Meta footer row
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...S400)
    const meta = [
      r.candidateLocation ? `📍 ${r.candidateLocation}` : null,
      (r.features?.totalYearsExperience ?? 0) > 0 ? `${r.features.totalYearsExperience}y exp` : null,
      r.features?.seniorityLevel && r.features.seniorityLevel !== 'Unknown' ? r.features.seniorityLevel : null,
      r.features?.projectCount ? `${r.features.projectCount} projects` : null,
      r.source === 'umurava_profile' ? 'Umurava' : r.source === 'external_cv' ? 'CV' : r.source === 'spreadsheet' ? 'Sheet' : null,
    ].filter(Boolean) as string[]
    doc.text(meta.join('   ·   '), M, y + 4)

    if (r.insight?.biasNote) {
      y += 8
      doc.setFillColor(254, 243, 199); doc.roundedRect(M, y, W - M * 2, 8, 2, 2, 'F')
      doc.setFontSize(7); doc.setTextColor(...AMBER)
      doc.text(`⚠ ${r.insight.biasNote}`, M + 4, y + 5.5)
    }

    // Page number
    doc.setFontSize(7); doc.setTextColor(...S400)
    doc.text(`${idx + 1} / ${results.length}`, R, 288, { align: 'right' })
  })

  doc.save(`screening-${job.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
  toast.success('PDF exported')
}

// ─── Running overlay ──────────────────────────────────────────────────────────
function RunningOverlay({ progress }: { progress: number }) {
  const stepIdx = Math.min(Math.floor((progress / 100) * STEPS.length), STEPS.length - 1)
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', padding: '32px 0' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
            <svg style={{ position: 'absolute', inset: 0, animation: 'spin 3s linear infinite' }}
              width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--border)" strokeWidth="2" />
              <path d="M24 4 A20 20 0 0 1 44 24" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#00C896' }}>{Math.round(progress)}%</span>
            </div>
          </div>
          <div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Running AI Screening</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Powered by Gemini</p>
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
                <p style={{ fontSize: 12, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step}</p>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: ScreeningStats }) {
  const fits = [
    { label: 'Strong Fit', color: '#059669' },
    { label: 'Good Fit', color: '#2563EB' },
    { label: 'Partial Fit', color: '#D97706' },
  ] as const
  return (
    <div className="card-sm" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px' }}>
      {[
        { val: stats.totalShortlisted, label: 'Shortlisted', color: '#059669' },
        { val: stats.scoreStats.avg, label: 'Avg Score', color: 'var(--umu-blue)' },
        { val: stats.scoreStats.max, label: 'Top Score', color: '#D97706' },
      ].map(({ val, label, color }, i) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 16px', borderRight: i < 2 ? '1px solid var(--border)' : undefined }}>
          <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{val}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{label}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px', flexWrap: 'wrap' }}>
        {fits.map(({ label, color }) => {
          const count = stats.fitDistribution[label] || 0
          if (!count) return null
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{count}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Deep Analysis content ────────────────────────────────────────────────────
function DeepAnalysisContent({ data }: { data: any }) {
  const { deepAnalysis } = data
  if (!deepAnalysis)
    return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No deep analysis data.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 10, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>
        Deep Analysis — {data.candidateName}
      </p>
      {Object.entries(deepAnalysis).map(([key, value]) => {
        if (value == null) return null
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
        if (Array.isArray(value)) return (
          <div key={key}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(value as any[]).map((item, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <span style={{ color: '#2563EB', flexShrink: 0, fontSize: 10, marginTop: 2 }}>›</span>
                  <span>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )
        if (typeof value === 'object') return (
          <div key={key}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(value as Record<string, any>).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: 90 }}>{k}:</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )
        return (
          <div key={key}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{String(value)}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Score columns — fixed vertical bar chart ─────────────────────────────────
// Fixed: uses position:absolute for fill so it truly grows from the bottom.
// The value label is centered in the fixed-height track regardless of fill height.
function ScoreColumns({ score }: { score: ScreeningResultItem['score'] }) {
  const cols = [
    { label: 'Skills', val: score?.skillScore ?? 0, color: '#2563EB' },
    { label: 'Exp', val: score?.experienceScore ?? 0, color: '#F5A623' },
    { label: 'Projects', val: score?.projectScore ?? 0, color: '#818CF8' },
    { label: 'Education', val: score?.educationScore ?? 0, color: '#00C896' },
    { label: 'Certs', val: score?.certificationScore ?? 0, color: '#34D399' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
      {cols.map(({ label, val, color }) => {
        const pct = Math.max(Math.min(val, 100), 0)
        const txCol = pct >= 70 ? '#059669' : pct >= 50 ? '#2563EB' : '#D97706'
        return (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* Fixed-height track */}
            <div style={{
              width: '100%', height: 56,
              borderRadius: 8,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Fill grows from bottom */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${pct}%`,
                background: color,
                opacity: 0.35,
                borderRadius: 8,
                transition: 'height 0.7s ease',
              }} />
              {/* Value — always centered regardless of fill */}
              <span style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: txCol,
                zIndex: 1,
              }}>
                {val}
              </span>
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{label}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({ result, index }: { result: ScreeningResultItem; index: number }) {
  const [open, setOpen] = useState(index < 3)
  const [deepOpen, setDeepOpen] = useState(false)
  const [deepData, setDeepData] = useState<any>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)

  const fit = FIT_STYLE[result.insight?.fitForRole as keyof typeof FIT_STYLE] ?? FIT_STYLE['Partial Fit']
  const initials = (result.candidateName || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const rankBg = result.rank === 1 ? 'rgba(245,158,11,0.12)' : result.rank === 2 ? 'rgba(148,163,184,0.1)' : result.rank === 3 ? 'rgba(176,141,87,0.1)' : 'var(--bg)'
  const rankColor = result.rank === 1 ? '#D97706' : result.rank === 2 ? '#64748B' : result.rank === 3 ? '#92400E' : 'var(--text-muted)'
  const rankBorder = result.rank <= 3
    ? `1px solid ${['rgba(245,158,11,0.3)', 'rgba(148,163,184,0.2)', 'rgba(176,141,87,0.2)'][result.rank - 1]}`
    : '1px solid var(--border)'


  // Deep analysis — resultId is now always present from normalise()
  const handleDeepAnalysis = async () => {
    if (!result.resultId) return
    if (deepData) { setDeepOpen(o => !o); return }
    setDeepOpen(true); setDeepLoading(true); setDeepError(null)

    try {
      const res = await screeningAPI.deepAnalysis(result.resultId)
      setDeepData(res.data?.data ?? null)
    } catch (err: any) {
      setDeepError(err.response?.data?.message || 'Failed to load deep analysis')
    } finally { setDeepLoading(false) }
  }

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      borderColor: result.rank === 1 ? 'rgba(245,158,11,0.25)' : undefined,
      animation: `cardIn 0.4s ease ${index * 50}ms both`,
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>

        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: rankBg, color: rankColor, border: rankBorder }}>
          {result.rank}
        </div>

        <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: 'var(--umu-blue-bg)', color: 'var(--umu-blue)', border: '1px solid var(--umu-blue-faint)' }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{result.candidateName || 'Unknown'}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: fit.bg, color: fit.text, border: `1px solid ${fit.border}`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: fit.dot }} />
              {result.insight?.fitForRole || 'Partial Fit'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.candidateHeadline || '—'}
          </p>
        </div>

        <ScoreRing score={result.score?.totalScore ?? 0} size={42} strokeWidth={3} />

        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4.5L6 8l4-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14, display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>

            {/* Score breakdown — fixed vertical bars */}
            <div style={{ gridColumn: '1 / -1' }}>
              <p className="section-label" style={{ marginBottom: 10 }}>Score Breakdown</p>
              <ScoreColumns score={result.score} />
            </div>

            {/* Strengths */}
            {(result.insight?.strengths?.length ?? 0) > 0 && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)' }}>
                <p style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Strengths</p>
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
            {(result.insight?.gaps?.length ?? 0) > 0 && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p style={{ fontSize: 9, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Gaps</p>
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
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {result.candidateLocation && <span>📍 {result.candidateLocation}</span>}
              {(result.features?.totalYearsExperience ?? 0) > 0 && <span>{result.features.totalYearsExperience}y exp</span>}
              {result.features?.seniorityLevel && result.features.seniorityLevel !== 'Unknown' && <span>{result.features.seniorityLevel}</span>}
            </div>

            {/* Deep Analysis
                Button visible whenever resultId is truthy.
                normalise() guarantees resultId is set from r.resultId OR r._id
                for both the initial GET load and the POST re-run.           */}
            {result.resultId && (
              <div style={{ gridColumn: '1 / -1', paddingTop: 4 }}>
                <button
                  onClick={handleDeepAnalysis}
                  disabled={deepLoading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                    cursor: deepLoading ? 'not-allowed' : 'pointer',
                    background: deepOpen ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)',
                    color: '#2563EB', border: '1px solid rgba(37,99,235,0.22)',
                    transition: 'background 0.15s',
                  }}
                >
                  {deepLoading ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 6" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {deepOpen && deepData ? 'Hide Deep Analysis' : 'Deep Analysis'}
                    </>
                  )}
                </button>

                {deepOpen && (
                  <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 10, background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)' }}>
                    {deepLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[80, 60, 90, 50].map((w, i) => (
                          <div key={i} className="shimmer" style={{ height: 12, borderRadius: 6, width: `${w}%` }} />
                        ))}
                      </div>
                    )}
                    {deepError && <p style={{ fontSize: 12, color: '#DC2626' }}>⚠ {deepError}</p>}
                    {!deepLoading && !deepError && deepData && <DeepAnalysisContent data={deepData} />}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
  const [stats, setStats] = useState<ScreeningStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const sfx = useSoundFX()
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await screeningAPI.stats(jobId)
      if (res.data?.data) setStats(res.data.data)
    } catch { }
    finally { setStatsLoading(false) }
  }, [jobId])

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
        setResults(reRankByScore((prevRes.data.data.results as any[]).map(normalise)))
        setPrevRunDate(prevRes.data.data.runDate)
        setPhase('done')
      }
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (phase === 'done') loadStats() }, [phase, loadStats])
  useEffect(() => {
    if (!loading && autoRun && phase === 'idle' && candidates.length > 0) runScreening()
  }, [loading, autoRun, phase, candidates.length])

  const runScreening = async () => {
    if (candidates.length === 0) { toast.error('No candidates for this job'); return }
    setPhase('running'); setProgress(0); setResults([]); setStats(null)
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

      const normalized = (res.data.data.results as any[]).map(normalise)
      // TEMPORARY DEBUG — remove after you confirm the field name
      console.log('POST /run result[0] raw:', res.data.data.results[0])
      console.log('POST /run normalized[0]:', normalized[0])
      sfx.complete()
      setTimeout(() => {
        setResults(reRankByScore(normalized))
        setPhase('done')
        setPrevRunDate(new Date().toISOString())
      }, 400)
    } catch (err: any) {
      clearInterval(progressRef.current!)
      setPhase('idle'); setProgress(0)
      toast.error(err.response?.data?.message || 'Screening failed')
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try { await exportToPDF(job, results, stats) }
    catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const avgScore = results.length
    ? Math.round(results.reduce((a, r) => a + (r.score?.totalScore ?? 0), 0) / results.length) : 0

  if (loading) return (
    <div style={{ padding: '32px', maxWidth: 800, margin: '0 auto' }}>
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 70, borderRadius: 10, marginBottom: 8 }} />
      ))}
    </div>
  )

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 800, margin: '0 auto' }}>

      <Link href="/screening"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20 }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        All Screenings
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{job?.title || '…'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{job?.company}{job?.location ? ` · ${job.location}` : ''}</p>
          {prevRunDate && phase === 'done' && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="section-label">Requirements</span>
            <span className="tag-green">{job.structuredRequirements.minExperienceYears}+ yrs · {job.structuredRequirements.educationLevel}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
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
        <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Top</span>
            <select value={topN} onChange={e => setTopN(Number(e.target.value))} className="input" style={{ width: 'auto', padding: '4px 8px', height: 32 }}>
              {[10, 20].map(n => <option key={n} value={n}>{n}</option>)}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Analyzed', val: candidates.length, color: 'var(--text-primary)' },
              { label: 'Shortlisted', val: results.length, color: '#059669' },
              { label: 'Avg Score', val: avgScore, color: 'var(--umu-blue)' },
            ].map(s => (
              <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {statsLoading
            ? <div className="shimmer" style={{ height: 52, borderRadius: 10, marginBottom: 16 }} />
            : stats ? <StatsBar stats={stats} /> : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              // Stable key: use resultId so React keeps card state across re-renders
              <ResultCard key={r.resultId ?? r.candidateId ?? i} result={r} index={i} />
            ))}
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