'use client'
import { useState } from 'react'
import { ScreeningResultItem } from '@/types'
import ScoreRing from '@/components/ui/ScoreRing'
import ScoreBar from '@/components/ui/ScoreBar'
import FitBadge from '@/components/ui/FitBadge'

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
  const { score, insight, features } = result
  const cardClass = RANK_STYLE[result.rank] || 'border-white/6'
  const badgeClass = RANK_BADGE[result.rank] || 'bg-white/5 text-white/50'

  const w = weights || { skills: 0.4, experience: 0.3, projects: 0.2, education: 0.05, certifications: 0.05 }

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
        </div>
      )}
    </div>
  )
}
