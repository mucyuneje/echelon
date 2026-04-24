'use client'
import { useState } from 'react'
import { ScreeningResultItem } from '@/types'
import ScoreRing from '@/components/ui/ScoreRing'
import ScoreBar from '@/components/ui/ScoreBar'
import FitBadge from '@/components/ui/FitBadge'
import { screeningAPI } from '@/lib/api'

interface Props {
  result: ScreeningResultItem
  weights?: Record<string, number>
  expanded?: boolean
}

const RANK_STYLE: Record<number, string> = {
  1: 'border-amber/30 bg-amber/5',
  2: 'border-white/15 bg-white/3',
  3: 'border-amber/15 bg-amber/3',
}

const RANK_BADGE: Record<number, string> = {
  1: 'bg-amber text-ink', 2: 'bg-white/20 text-white', 3: 'bg-amber/40 text-white'
}

export default function CandidateCard({ result, weights }: Props) {
  const [open, setOpen] = useState(result.rank <= 3)
  const [deepOpen, setDeepOpen] = useState(false)
  const [deepData, setDeepData] = useState<any>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)

  const { score, insight, features } = result
  const cardClass = RANK_STYLE[result.rank] || 'border-white/6'
  const badgeClass = RANK_BADGE[result.rank] || 'bg-white/5 text-white/50'

  const w = weights || { skills: 0.4, experience: 0.3, projects: 0.2, education: 0.05, certifications: 0.05 }

  const handleDeepAnalysis = async () => {
    if (!result.resultId) return

    // If already loaded, just toggle
    if (deepData) {
      setDeepOpen(o => !o)
      return
    }

    setDeepOpen(true)
    setDeepLoading(true)
    setDeepError(null)
    try {
      const res = await screeningAPI.deepAnalysis(result.resultId)
      setDeepData(res.data?.data || null)
    } catch (err: any) {
      setDeepError(err.response?.data?.message || 'Failed to load deep analysis')
    } finally {
      setDeepLoading(false)
    }
  }

  return (
    <div className={`card border transition-all ${cardClass} ${result.rank === 1 ? 'rank-1' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-4 cursor-pointer" onClick={() => setOpen(!open)}>
        {/* Rank */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${badgeClass}`}>
          #{result.rank}
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-jade/20 to-jade/5 border border-jade/20 flex items-center justify-center text-jade text-sm font-bold flex-shrink-0">
            {result.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white text-sm font-semibold truncate">{result.candidateName}</p>
              <FitBadge fit={insight.fitForRole} />
            </div>
            <p className="text-white/40 text-xs truncate mt-0.5">{result.candidateHeadline}</p>
          </div>
        </div>

        {/* Score Ring */}
        <div className="flex-shrink-0">
          <ScoreRing score={score.totalScore} size={60} strokeWidth={5} />
        </div>

        {/* Chevron */}
        <div className={`text-white/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▾</div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="mt-5 pt-5 border-t border-white/6 space-y-5 animate-fade-up">
          {/* Score breakdown */}
          <div>
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Score Breakdown</p>
            <div className="space-y-2.5">
              <ScoreBar label="Skills Match" value={score.skillScore} weight={w.skills} />
              <ScoreBar label="Experience" value={score.experienceScore} weight={w.experience} color="#F5A623" />
              <ScoreBar label="Projects" value={score.projectScore} weight={w.projects} color="#818CF8" />
              <ScoreBar label="Education" value={score.educationScore} weight={w.education} color="#F472B6" />
              <ScoreBar label="Certifications" value={score.certificationScore} weight={w.certifications} color="#34D399" />
            </div>
          </div>

          {/* AI Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2.5">✦ Strengths</p>
              <ul className="space-y-1.5">
                {insight.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                    <span className="text-jade mt-0.5 flex-shrink-0">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps */}
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2.5">⚠ Gaps</p>
              {insight.gaps.length > 0 ? (
                <ul className="space-y-1.5">
                  {insight.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <span className="text-amber mt-0.5 flex-shrink-0">!</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-white/30 text-xs">No significant gaps identified</p>}
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-white/3 rounded-lg px-4 py-3 border border-white/6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1.5">AI Recommendation</p>
                <p className="text-white/80 text-sm leading-relaxed">{insight.recommendation}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white/30 text-xs mb-1">Confidence</p>
                <p className="text-white font-semibold text-sm">{Math.round((insight.confidence || 0.7) * 100)}%</p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-white/25 flex-wrap">
            <span>{features.seniorityLevel} · {features.totalYearsExperience.toFixed(1)}y exp</span>
            <span>{result.candidateLocation}</span>
            <span>{features.projectCount} projects</span>
            <span>{result.source === 'umurava_profile' ? 'Umurava' : result.source === 'external_cv' ? 'PDF CV' : 'Spreadsheet'}</span>
            {insight.biasNote && <span className="text-amber/50">⚠ {insight.biasNote}</span>}
          </div>

          {insight.alternativeRoleSuggestion && (
            <p className="text-xs text-white/30">
              <span className="text-white/40 font-medium">Alternative role: </span>
              {insight.alternativeRoleSuggestion}
            </p>
          )}

          {/* Deep Analysis button — only shown when resultId exists */}
          {result.resultId && (
            <div className="pt-1">
              <button
                onClick={handleDeepAnalysis}
                disabled={deepLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                  padding: '6px 12px', borderRadius: 8, cursor: deepLoading ? 'not-allowed' : 'pointer',
                  background: deepOpen ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
                  color: '#2563EB', border: '1px solid rgba(37,99,235,0.25)',
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

              {/* Deep Analysis panel */}
              {deepOpen && (
                <div style={{
                  marginTop: 10, padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)',
                }}>
                  {deepLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[80, 60, 90, 50].map((w, i) => (
                        <div key={i} className="shimmer" style={{ height: 12, borderRadius: 6, width: `${w}%` }} />
                      ))}
                    </div>
                  )}

                  {deepError && (
                    <p style={{ fontSize: 12, color: '#DC2626', fontFamily: 'monospace' }}>⚠ {deepError}</p>
                  )}

                  {!deepLoading && !deepError && deepData && (
                    <DeepAnalysisContent data={deepData} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/* Renders whatever fields the deep analysis endpoint returns */
function DeepAnalysisContent({ data }: { data: any }) {
  const { deepAnalysis } = data

  if (!deepAnalysis) {
    return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No deep analysis data available.</p>
  }

  // deepAnalysis is an object — render each field generically
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 10, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', fontWeight: 700, marginBottom: 2 }}>
        Deep Analysis — {data.candidateName}
      </p>
      {Object.entries(deepAnalysis).map(([key, value]) => {
        if (value === null || value === undefined) return null
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())

        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'monospace', marginBottom: 6 }}>{label}</p>
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
        }

        if (typeof value === 'object') {
          return (
            <div key={key}>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'monospace', marginBottom: 6 }}>{label}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(value as Record<string, any>).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, minWidth: 90 }}>{k}:</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        return (
          <div key={key}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'monospace', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{String(value)}</p>
          </div>
        )
      })}
    </div>
  )
}