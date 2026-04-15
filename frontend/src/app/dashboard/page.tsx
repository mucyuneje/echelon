'use client'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { jobsAPI, candidatesAPI } from '@/lib/api'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'

interface Stats { jobs: number; candidates: number }

export default function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user)
  const [stats, setStats] = useState<Stats | null>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([jobsAPI.list(), candidatesAPI.list({ limit: 5 })])
      .then(([jobsRes, canRes]) => {
        setJobs(jobsRes.data.data?.slice(0, 4) || [])
        setStats({ jobs: jobsRes.data.count || 0, candidates: canRes.data.total || 0 })
      })
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10 animate-fade-up">
        <p className="text-white/40 text-sm mb-1">{greeting},</p>
        <h1 className="text-3xl font-display text-white">{user?.name || 'Recruiter'}</h1>
        <p className="text-white/40 text-sm mt-1">Here's your recruitment overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Jobs', value: stats?.jobs ?? '—', color: '#00C896', icon: '⬡' },
          { label: 'Total Candidates', value: stats?.candidates ?? '—', color: '#F5A623', icon: '◈' },
          { label: 'Screenings Run', value: '—', color: '#818CF8', icon: '◎' },
          { label: 'Avg Match Score', value: '—', color: '#F472B6', icon: '◐' },
        ].map((s, i) => (
          <div key={i} className="card animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{s.icon}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            </div>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> :
              <p className="text-3xl font-display text-white">{s.value}</p>}
            <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Recent Jobs</h2>
          <Link href="/jobs" className="text-jade text-xs hover:underline">View all →</Link>
        </div>
        <div className="space-y-2">
          {loading ? Array(3).fill(0).map((_, i) => (
            <div key={i} className="card flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          )) : jobs.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-white/30 text-sm">No jobs yet.</p>
              <Link href="/jobs/new" className="btn-primary mt-3 inline-flex">+ Create your first job</Link>
            </div>
          ) : jobs.map((job: any) => (
            <div key={job._id} className="card flex items-center justify-between gap-4 hover:border-white/10 transition-all">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{job.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{job.company} · {job.location}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge text-xs ${job.structuredRequirements ? 'bg-jade/10 text-jade' : 'bg-amber/10 text-amber'}`}>
                  {job.structuredRequirements ? '✓ AI Analyzed' : '⏳ Analyzing...'}
                </span>
                <Link href={`/screening/${job._id}`} className="btn-primary text-xs px-3 py-1.5">
                  Screen →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
        {[
          { href: '/jobs/new', title: 'Post a Job', desc: 'Create a new position and let AI analyze requirements', color: '#00C896' },
          { href: '/candidates', title: 'Upload Candidates', desc: 'Import CVs or spreadsheets for AI screening', color: '#F5A623' },
          { href: '/jobs', title: 'Run Screening', desc: 'Select a job and screen all candidates with AI', color: '#818CF8' },
        ].map((a, i) => (
          <Link key={i} href={a.href}
            className="card hover:border-white/12 transition-all group cursor-pointer">
            <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${a.color}15`, border: `1px solid ${a.color}20` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
            </div>
            <h3 className="text-white text-sm font-semibold mb-1 group-hover:text-jade transition-colors">{a.title}</h3>
            <p className="text-white/40 text-xs leading-relaxed">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
