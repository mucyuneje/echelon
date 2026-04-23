'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jobsAPI } from '@/lib/api'
import { Job } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobsAPI.get(id)
      .then(r => setJob(r.data.data))
      .catch(() => { toast.error('Job not found'); router.push('/jobs') })
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm(`Delete "${job?.title}"?`)) return
    await jobsAPI.delete(id)
    toast.success('Job deleted')
    router.push('/jobs')
  }

  const handleReanalyze = async () => {
    toast.loading('Running AI analysis...')
    try {
      await jobsAPI.analyze(id)
      toast.dismiss()
      toast.success('Job re-analyzed!')
      jobsAPI.get(id).then(r => setJob(r.data.data))
    } catch { toast.dismiss(); toast.error('Analysis failed') }
  }

  if (loading) return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-40 w-full" />
    </div>
  )

  if (!job) return null

  const req = job.structuredRequirements

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto animate-fade-up">

      {/* Back — FIX: use CSS vars not text-white */}
      <Link href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color:'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
        ← Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-2">
            {/* FIX: text-body-primary instead of text-white */}
            <h1 className="text-2xl font-bold text-body-primary">{job.title}</h1>
            <span className="badge tag text-xs">{job.jobType}</span>
            {req ? (
              <span className="badge text-xs" style={{ background:'rgba(5,150,105,0.1)', color:'#059669', border:'1px solid rgba(5,150,105,0.2)' }}>✓ AI Analyzed</span>
            ) : (
              <span className="badge text-xs" style={{ background:'rgba(245,158,11,0.1)', color:'#D97706', border:'1px solid rgba(245,158,11,0.2)' }}>⏳ Analyzing</span>
            )}
          </div>
          <p className="text-body-secondary text-sm">{job.company} · {job.location}</p>
          <p className="text-body-muted text-xs mt-1">
            Posted by {job.createdBy?.name || 'Unknown'} · {new Date(job.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/screening/${job._id}`} className="btn-primary text-sm px-4 py-2">
            Screen Candidates →
          </Link>
          {/* FIX: btn-secondary now defined in globals */}
          <button onClick={handleReanalyze} className="btn-secondary text-sm px-3 py-2" title="Re-analyze">↻</button>
          <button onClick={handleDelete} className="btn-danger text-sm px-3 py-2" title="Delete">✕</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card">
            <h2 className="text-body-primary font-semibold text-sm mb-3 flex items-center gap-2">
              {/* FIX: use umu-blue accent instead of jade */}
              <span style={{ color:'var(--umu-blue)' }}>◈</span> Job Description
            </h2>
            <div className="text-body-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {job.description || 'No description provided.'}
            </div>
          </div>

          {req?.keyResponsibilities?.length ? (
            <div className="card">
              <h2 className="text-body-primary font-semibold text-sm mb-3 flex items-center gap-2">
                <span style={{ color:'var(--umu-blue)' }}>▦</span> Key Responsibilities
              </h2>
              <ul className="space-y-2">
                {req.keyResponsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-body-secondary">
                    <span className="flex-shrink-0 mt-0.5" style={{ color:'var(--umu-blue)' }}>→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="text-body-primary font-semibold text-sm mb-1">Details</h2>
            {[
              { label:'Type',           value: job.jobType },
              { label:'Location',       value: job.location },
              { label:'Company',        value: job.company },
              { label:'Status',         value: job.isActive ? 'Active' : 'Closed' },
              ...(req ? [
                { label:'Min Experience', value:`${req.minExperienceYears}+ years` },
                { label:'Education',      value: req.educationLevel },
                { label:'Role Type',      value: req.roleType },
              ] : [])
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-body-muted text-xs">{label}</span>
                <span className="text-body-secondary text-xs font-medium">{value}</span>
              </div>
            ))}
          </div>

          {req?.requiredSkills?.length ? (
            <div className="card">
              <h2 className="text-body-primary font-semibold text-sm mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {req.requiredSkills.map(s => (
                  <span key={s} className="tag-blue text-xs">{s}</span>
                ))}
              </div>
            </div>
          ) : null}

          {req?.optionalSkills?.length ? (
            <div className="card">
              <h2 className="text-body-primary font-semibold text-sm mb-3">Nice to Have</h2>
              <div className="flex flex-wrap gap-1.5">
                {req.optionalSkills.map(s => (
                  <span key={s} className="tag text-xs">{s}</span>
                ))}
              </div>
            </div>
          ) : null}

          {req?.weights && (
            <div className="card">
              <h2 className="text-body-primary font-semibold text-sm mb-3">AI Scoring Weights</h2>
              <div className="space-y-2">
                {Object.entries(req.weights).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-body-muted text-xs w-20 capitalize">{k}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width:`${(v as number)*100}%`, background:'var(--umu-blue)' }}/>
                    </div>
                    <span className="text-body-secondary text-xs w-8 text-right">{Math.round((v as number)*100)}%</span>
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