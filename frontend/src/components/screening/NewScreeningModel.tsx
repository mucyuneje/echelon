'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Job } from '@/types'

interface Props {
  jobs: Job[]
  candMap: Record<string, number>
  onClose: () => void
}

export default function NewScreeningModal({ jobs, candMap, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [topN, setTopN] = useState(10)
  const [search, setSearch] = useState('')

  const filteredJobs = jobs.filter(j => {
    const s = search.toLowerCase()
    return !s || j.title.toLowerCase().includes(s) || j.company.toLowerCase().includes(s)
  })

  const handleStart = () => {
    if (!selectedJob) return
    onClose()
    router.push(`/screening/${selectedJob._id}?topN=${topN}&autoRun=1`)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 540,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {step === 1 ? 'Choose a Job' : 'Configure Screening'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[1, 2].map(n => (
                <div key={n} style={{
                  height: 3, width: n <= step ? 24 : 14, borderRadius: 2,
                  background: n <= step ? '#00C896' : 'var(--border)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Step {step} of 2</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="var(--text-muted)" strokeWidth="1.2" />
                <path d="M9 9l2.5 2.5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search jobs…" autoFocus className="input"
                style={{ paddingLeft: 32 }} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380 }}>
              {filteredJobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No jobs found
                </div>
              )}
              {filteredJobs.map(job => {
                const cnt = candMap[job._id] || 0
                const isSelected = selectedJob?._id === job._id
                const isReady = !!job.structuredRequirements
                return (
                  <div key={job._id} onClick={() => setSelectedJob(job)} style={{
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    background: isSelected ? 'rgba(0,200,150,0.06)' : 'var(--bg)',
                    border: isSelected ? '1px solid rgba(0,200,150,0.3)' : '1px solid var(--border)',
                    transition: 'all 0.15s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' as const }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</span>
                          {isReady && (
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 20,
                              background: 'rgba(0,200,150,0.1)', color: '#00C896',
                              border: '1px solid rgba(0,200,150,0.2)',
                            }}>AI ready</span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {job.company}{job.location ? ` · ${job.location}` : ''}
                        </p>
                        {isSelected && job.structuredRequirements?.requiredSkills && job.structuredRequirements.requiredSkills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 8 }}>
                            {job.structuredRequirements.requiredSkills.slice(0, 5).map(s => (
                              <span key={s} className="tag-green" style={{ fontSize: 10 }}>{s}</span>
                            ))}
                            {(job.structuredRequirements.requiredSkills.length ?? 0) > 5 && (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                +{job.structuredRequirements.requiredSkills.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
                          color: cnt > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}>{cnt}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>candidates</div>
                      </div>
                    </div>
                    {cnt === 0 && (
                      <p style={{ fontSize: 10, color: '#D97706', marginTop: 6 }}>
                        ⚠ No candidates — upload some first
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => selectedJob && setStep(2)}
                disabled={!selectedJob || (candMap[selectedJob._id] || 0) === 0}
                className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                Next →
              </button>
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && selectedJob && (
          <>
            <div style={{
              borderRadius: 10, padding: '12px 14px', marginBottom: 20,
              background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{selectedJob.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedJob.company}</p>
                </div>
                <span className="tag-green">{candMap[selectedJob._id] || 0} candidates</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                How many top candidates to shortlist?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[10,20].map(n => (
                  <button key={n} onClick={() => setTopN(n)} style={{
                    height: 48, borderRadius: 10, cursor: 'pointer',
                    border: topN === n ? '2px solid #00C896' : '1px solid var(--border)',
                    background: topN === n ? 'rgba(0,200,150,0.08)' : 'var(--bg)',
                    color: topN === n ? '#00C896' : 'var(--text-secondary)',
                    fontSize: 16, fontWeight: 700, fontFamily: 'monospace',
                    transition: 'all 0.15s ease',
                  }}>{n}</button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                AI will analyze all {candMap[selectedJob._id] || 0} candidates and return the top {topN}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>← Back</button>
              <button onClick={handleStart} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                Run Screening →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}