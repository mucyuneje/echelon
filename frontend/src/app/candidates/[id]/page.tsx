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

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)

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
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }} className="space-y-4">
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

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 900, margin: '0 auto' }} className="animate-fade-up">

      {/* Back */}
      <Link href="/candidates" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20,
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
        ← Back to Candidates
      </Link>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: '#00C896',
            }}>{initials}</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {p.firstName} {p.lastName}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{p.headline}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                {p.location && <span>📍 {p.location}</span>}
                {p.email && <span>✉ {p.email}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}>
              {SOURCE_LABEL[candidate.source] || candidate.source}
            </span>
            <button onClick={handleDelete} className="btn-danger" style={{ fontSize: 12, padding: '5px 12px' }}>
              Remove
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
          marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)',
        }}>
          {[
            { label: 'Experience', value: `${f.totalYearsExperience.toFixed(1)}y` },
            { label: 'Level',      value: f.seniorityLevel },
            { label: 'Projects',   value: f.projectCount },
            { label: 'Certifications', value: f.hasRelevantCertifications ? 'Yes' : 'None' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Bio */}
          {p.bio && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 10 }}>About</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p.bio}</p>
            </div>
          )}

          {/* Experience */}
          {p.experience?.length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 14 }}>Work Experience</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {p.experience.map((exp: any, i: number) => (
                  <div key={i} style={{ position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                    <div style={{
                      position: 'absolute', left: -5, top: 4,
                      width: 8, height: 8, borderRadius: '50%', background: '#00C896',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.role}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.company}</p>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {exp['Start Date'] || exp.startDate} — {exp['Is Current'] || exp.isCurrent ? 'Present' : (exp['End Date'] || exp.endDate)}
                      </p>
                    </div>
                    {exp.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{exp.description}</p>
                    )}
                    {exp.technologies?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {exp.technologies.map((t: string) => (
                          <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {p.projects?.length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 14 }}>Projects</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.projects.map((proj: any, i: number) => (
                  <div key={i} style={{
                    padding: 12, borderRadius: 10,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</p>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: '#00C896', textDecoration: 'none' }}>
                          ↗ Link
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{proj.description}</p>
                    )}
                    {proj.technologies?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {proj.technologies.map((t: string) => (
                          <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Skills */}
          {p.skills?.length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 12 }}>Skills</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.skills.map((s: any) => {
                  const lc = LEVEL_COLOR[s.level] || LEVEL_COLOR['Beginner']
                  return (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`,
                      }}>{s.level}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Education */}
          {p.education?.length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 12 }}>Education</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.education.map((e: any, i: number) => (
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
          )}

          {/* Certifications */}
          {p.certifications?.length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 12 }}>Certifications</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.certifications.map((c: any, i: number) => (
                  <div key={i} style={{
                    padding: 10, borderRadius: 8,
                    background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)',
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#00C896' }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.issuer} · {c['Issue Date'] || c.issueDate}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          {p.availability && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 12 }}>Availability</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: availColor, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.availability.status}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.availability.type}</p>
            </div>
          )}

          {/* Social links */}
          {p.socialLinks && Object.keys(p.socialLinks).length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 12 }}>Links</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(p.socialLinks).map(([k, v]) => v ? (
                  <a key={k} href={v as string} target="_blank" rel="noreferrer" style={{
                    fontSize: 12, color: '#00C896', textDecoration: 'none',
                    textTransform: 'capitalize',
                  }}>↗ {k}</a>
                ) : null)}
              </div>
            </div>
          )}

          {/* Languages */}
          {(p as any).languages?.length > 0 && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 12 }}>Languages</p>
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
    </div>
  )
}