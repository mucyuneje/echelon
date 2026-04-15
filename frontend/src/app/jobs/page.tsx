'use client'
import { useEffect, useState } from 'react'
import { jobsAPI } from '@/lib/api'
import Link from 'next/link'
import { Job } from '@/types'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const loadJobs = () => {
    setLoading(true)
    jobsAPI.list()
      .then(r => setJobs(r.data.data || []))
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadJobs() }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await jobsAPI.delete(id)
    toast.success('Job deleted')
    loadJobs()
  }

  const handleReanalyze = async (id: string) => {
    toast.loading('Running AI analysis...')
    try {
      await jobsAPI.analyze(id)
      toast.dismiss()
      toast.success('Job re-analyzed by AI!')
      loadJobs()
    } catch { toast.dismiss(); toast.error('Analysis failed') }
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display text-white">Jobs</h1>
          <p className="text-white/40 text-sm mt-0.5">{jobs.length} active positions</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          <span>+</span> New Job
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">⬡</p>
          <p className="text-white text-base font-medium mb-1">No jobs yet</p>
          <p className="text-white/40 text-sm mb-5">Create your first job to start screening candidates</p>
          <Link href="/jobs/new" className="btn-primary inline-flex">+ Create Job</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <div key={job._id} className="card hover:border-white/10 transition-all animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-white font-semibold text-sm">{job.title}</h2>
                    <span className="badge bg-white/5 text-white/40 text-xs">{job.jobType}</span>
                    {job.structuredRequirements ? (
                      <span className="badge bg-jade/10 text-jade border border-jade/15 text-xs">✓ AI Analyzed</span>
                    ) : (
                      <span className="badge bg-amber/10 text-amber border border-amber/15 text-xs">⏳ Analyzing</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-1">{job.company} · {job.location}</p>
                  {job.structuredRequirements && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {job.structuredRequirements.requiredSkills.slice(0, 5).map(skill => (
                        <span key={skill} className="badge bg-white/5 text-white/50 text-xs">{skill}</span>
                      ))}
                      {job.structuredRequirements.requiredSkills.length > 5 && (
                        <span className="badge bg-white/5 text-white/30 text-xs">+{job.structuredRequirements.requiredSkills.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/screening/${job._id}`} className="btn-primary text-xs px-3 py-1.5">
                    Screen →
                  </Link>
                  <button onClick={() => handleReanalyze(job._id)}
                    className="btn-secondary text-xs px-3 py-1.5">↻</button>
                  <button onClick={() => handleDelete(job._id, job.title)}
                    className="btn-secondary text-xs px-3 py-1.5 text-crimson hover:text-crimson">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
