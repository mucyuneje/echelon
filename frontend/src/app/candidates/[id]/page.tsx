'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { candidatesAPI } from '@/lib/api'
import { Candidate } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'

const LEVEL_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Expert:       { bg: 'rgba(0,200,150,0.1)',  text: '#059669', border: 'rgba(0,200,150,0.25)' },
  Advanced:     { bg: 'rgba(37,99,235,0.1)',  text: '#2563EB', border: 'rgba(37,99,235,0.25)' },
  Intermediate: { bg: 'rgba(245,158,11,0.1)', text: '#D97706', border: 'rgba(245,158,11,0.25)' },
  Beginner:     { bg: 'rgba(148,163,184,0.1)',text: '#94A3B8', border: 'rgba(148,163,184,0.2)' },
}

const SOURCE_LABEL: Record<string, string> = {
  umurava_profile: 'Umurava Profile',
  external_cv:     'PDF Resume',
  external_csv:    'Spreadsheet',
}

// ── tiny icon helpers ──────────────────────────────────────────────────────────
const Icon = {
  location: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1C4.567 1 3 2.567 3 4.5c0 2.625 3.5 7.5 3.5 7.5S10 7.125 10 4.5C10 2.567 8.433 1 6.5 1z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6.5" cy="4.5" r="1.2" fill="currentColor"/></svg>,
  mail:     <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="11" height="7.5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 4l5.5 3.5L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  clock:    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 3.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  level:    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="8" width="3" height="4" rx="0.8" fill="currentColor" opacity=".4"/><rect x="5" y="5" width="3" height="7" rx="0.8" fill="currentColor" opacity=".7"/><rect x="9" y="2" width="3" height="10" rx="0.8" fill="currentColor"/></svg>,
  proj:     <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>,
  cert:     <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 8.5L4 12l2.5-1.5L9 12l-.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  link:     <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 3H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M8 1h3v3M11 1L6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash:    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5h10M4.5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1M5.5 6v4M7.5 6v4M2.5 3.5l.5 7a1 1 0 001 1h5a1 1 0 001-1l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'overview'|'experience'|'projects'>('overview')

  useEffect(() => {
    candidatesAPI.get(id)
      .then(r => setCandidate(r.data.data))
      .catch(() => { toast.error('Candidate not found'); router.push('/candidates') })
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    const name = `${candidate?.profile.firstName} ${candidate?.profile.lastName}`
    if (!confirm(`Remove ${name}?`)) return
    await candidatesAPI.delete(id)
    toast.success('Candidate removed')
    router.push('/candidates')
  }

  if (loading) return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }} className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )

  if (!candidate) return null
  const p = candidate.profile
  const f = candidate.features
  const initials = `${p.firstName[0]}${p.lastName[0]}`
  const availColor = p.availability?.status === 'Available'
    ? '#00C896' : p.availability?.status === 'Open to Opportunities'
    ? '#F59E0B' : '#EF4444'

  const stats = [
    { icon: Icon.clock, label: 'Experience', value: `${f.totalYearsExperience.toFixed(1)}y` },
    { icon: Icon.level, label: 'Level',      value: f.seniorityLevel },
    { icon: Icon.proj,  label: 'Projects',   value: String(f.projectCount) },
    { icon: Icon.cert,  label: 'Certs',      value: f.hasRelevantCertifications ? 'Yes' : 'None' },
  ]

  return (
    <>
      <style>{`
        .cd-wrap { padding: 20px 28px 80px; max-width: 900px; margin: 0 auto; }
        .cd-grid { display: grid; grid-template-columns: 1fr 280px; gap: 14px; align-items: start; }
        .cd-tabs { display: none; }

        /* stat grid: 4 cols desktop */
        .cd-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; }
        .cd-stat-divider { border-right: 1px solid var(--border); }
        .cd-stat-divider:last-child { border-right: none; }

        @media (max-width: 768px) {
          .cd-wrap { padding: 14px 14px 80px; }

          /* Hide desktop right column, show tabs instead */
          .cd-grid { grid-template-columns: 1fr; }
          .cd-right-col { display: none !important; }
          .cd-tabs { display: flex; }

          /* Compact header on mobile */
          .cd-header-inner { flex-direction: column; gap: 10px !important; }
          .cd-header-meta  { flex-direction: row; flex-wrap: wrap; gap: 6px !important; }
          .cd-header-actions { align-self: flex-end; }

          /* Stats: 2x2 on mobile */
          .cd-stats { grid-template-columns: repeat(2,1fr); }
          .cd-stat-divider:nth-child(2) { border-right: none; }
          .cd-stat-divider:nth-child(1),
          .cd-stat-divider:nth-child(2) { border-bottom: 1px solid var(--border); }

          /* Avatar smaller */
          .cd-avatar { width: 44px !important; height: 44px !important; font-size: 15px !important; border-radius: 12px !important; }
          .cd-name   { font-size: 16px !important; }

          /* Tab panel for mobile */
          .cd-tab-panel { display: none; }
          .cd-tab-panel.active { display: block; }
        }

        @media (min-width: 769px) {
          .cd-left-col  { display: flex; flex-direction: column; gap: 14px; }
          .cd-right-col { display: flex; flex-direction: column; gap: 12px; }
          .cd-tab-panel { display: block !important; }
          .cd-tabs { display: none !important; }
          .cd-mobile-sidebar { display: none !important; }
        }
      `}</style>

      <div className="cd-wrap animate-fade-up">

        {/* ── Back ── */}
        <Link href="/candidates" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 16,
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Candidates
        </Link>

        {/* ── Header card ── */}
        <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
          <div className="cd-header-inner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>

            {/* Left: avatar + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              <div className="cd-avatar" style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#00C896',
              }}>{initials}</div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <h1 className="cd-name" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {p.firstName} {p.lastName}
                  </h1>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 20,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', flexShrink: 0,
                  }}>{SOURCE_LABEL[candidate.source] || candidate.source}</span>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>{p.headline}</p>

                <div className="cd-header-meta" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {p.location && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {Icon.location} {p.location}
                    </span>
                  )}
                  {p.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {Icon.mail} <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{p.email}</span>
                    </span>
                  )}
                  {p.availability && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: availColor, flexShrink: 0 }}/>
                      {p.availability.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="cd-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {p.socialLinks && Object.entries(p.socialLinks).map(([k, v]) => v ? (
                <a key={k} href={v as string} target="_blank" rel="noreferrer"
                  title={k}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', textDecoration: 'none',
                    fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                  }}>
                  {Icon.link}
                </a>
              ) : null)}
              <button onClick={handleDelete}
                title="Remove candidate"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.06)', color: '#EF4444',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>
                <span className="cd-remove-icon">{Icon.trash}</span>
                <span className="cd-remove-text">Remove</span>
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="cd-stats" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {stats.map(({ icon, label, value }, i) => (
              <div key={label} className={`cd-stat-divider`} style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile tabs ── */}
        <div className="cd-tabs" style={{ gap: 0, marginBottom: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)' }}>
          {(['overview','experience','projects'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                background: tab === t ? '#2563EB' : 'transparent',
                color: tab === t ? 'white' : 'var(--text-muted)',
                transition: 'background 0.15s, color 0.15s',
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Body grid ── */}
        <div className="cd-grid">

          {/* Left column */}
          <div className="cd-left-col">

            {/* OVERVIEW tab panel (mobile) / always visible desktop */}
            <div className={`cd-tab-panel ${tab === 'overview' ? 'active' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Bio */}
                {p.bio && (
                  <div className="card">
                    <p className="section-label" style={{ marginBottom: 8 }}>About</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p.bio}</p>
                  </div>
                )}

                {/* Mobile-only sidebar content inside overview tab */}
                <div className="cd-mobile-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <MobileSkills skills={p.skills} />
                  <MobileEducation education={p.education} />
                  <MobileCerts certs={p.certifications} />
                </div>
              </div>
            </div>

            {/* EXPERIENCE tab panel */}
            <div className={`cd-tab-panel ${tab === 'experience' ? 'active' : ''}`}>
              {p.experience?.length > 0 ? (
                <div className="card">
                  <p className="section-label" style={{ marginBottom: 14 }}>Work Experience</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {p.experience.map((exp: any, i: number) => (
                      <div key={i} style={{ position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                        <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.role}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.company}</p>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {exp['Start Date'] || exp.startDate} — {exp['Is Current'] || exp.isCurrent ? 'Present' : (exp['End Date'] || exp.endDate)}
                          </p>
                        </div>
                        {exp.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{exp.description}</p>}
                        {exp.technologies?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {exp.technologies.map((t: string) => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No experience listed
                </div>
              )}
            </div>

            {/* PROJECTS tab panel */}
            <div className={`cd-tab-panel ${tab === 'projects' ? 'active' : ''}`}>
              {p.projects?.length > 0 ? (
                <div className="card">
                  <p className="section-label" style={{ marginBottom: 14 }}>Projects</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {p.projects.map((proj: any, i: number) => (
                      <div key={i} style={{ padding: 12, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</p>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#00C896', textDecoration: 'none' }}>
                              {Icon.link} Link
                            </a>
                          )}
                        </div>
                        {proj.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{proj.description}</p>}
                        {proj.technologies?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {proj.technologies.map((t: string) => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No projects listed
                </div>
              )}
            </div>

            {/* Desktop-only: experience + projects always visible below overview */}
            <div className="cd-desktop-sections" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {p.experience?.length > 0 && (
                <div className="card">
                  <p className="section-label" style={{ marginBottom: 14 }}>Work Experience</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {p.experience.map((exp: any, i: number) => (
                      <div key={i} style={{ position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                        <div style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.role}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.company}</p>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {exp['Start Date'] || exp.startDate} — {exp['Is Current'] || exp.isCurrent ? 'Present' : (exp['End Date'] || exp.endDate)}
                          </p>
                        </div>
                        {exp.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{exp.description}</p>}
                        {exp.technologies?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {exp.technologies.map((t: string) => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {p.projects?.length > 0 && (
                <div className="card">
                  <p className="section-label" style={{ marginBottom: 14 }}>Projects</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {p.projects.map((proj: any, i: number) => (
                      <div key={i} style={{ padding: 12, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</p>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#00C896', textDecoration: 'none' }}>
                              {Icon.link} Link
                            </a>
                          )}
                        </div>
                        {proj.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{proj.description}</p>}
                        {proj.technologies?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {proj.technologies.map((t: string) => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column — desktop only */}
          <div className="cd-right-col">
            <MobileSkills skills={p.skills} />
            <MobileEducation education={p.education} />
            <MobileCerts certs={p.certifications} />
            {(p as any).languages?.length > 0 && (
              <div className="card">
                <p className="section-label" style={{ marginBottom: 10 }}>Languages</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(p as any).languages.map((l: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fix: hide desktop-only sections on mobile */}
        <style>{`
          @media (max-width: 768px) {
            .cd-desktop-sections { display: none !important; }
            .cd-remove-text { display: none; }
          }
          @media (min-width: 769px) {
            .cd-tab-panel { display: block !important; }
            .cd-desktop-sections { display: flex !important; }
          }
        `}</style>
      </div>
    </>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function MobileSkills({ skills }: { skills: any[] }) {
  if (!skills?.length) return null
  return (
    <div className="card">
      <p className="section-label" style={{ marginBottom: 10 }}>Skills</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {skills.map((s: any) => {
          const lc = LEVEL_COLOR[s.level] || LEVEL_COLOR['Beginner']
          return (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`, flexShrink: 0 }}>{s.level}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MobileEducation({ education }: { education: any[] }) {
  if (!education?.length) return null
  return (
    <div className="card">
      <p className="section-label" style={{ marginBottom: 10 }}>Education</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {education.map((e: any, i: number) => (
          <div key={i}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {e.degree} in {e['Field of Study'] || e.fieldOfStudy}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.institution}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {e['Start Year'] || e.startYear} – {e['End Year'] || e.endYear}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileCerts({ certs }: { certs: any[] }) {
  if (!certs?.length) return null
  return (
    <div className="card">
      <p className="section-label" style={{ marginBottom: 10 }}>Certifications</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {certs.map((c: any, i: number) => (
          <div key={i} style={{ padding: 10, borderRadius: 8, background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#00C896' }}>{c.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {c.issuer} · {c['Issue Date'] || c.issueDate}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}