'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { jobsAPI, screeningAPI } from '@/lib/api'
import { Job, ScreeningResponse, ScreeningStats } from '@/types'
import CandidateCard from '@/components/screening/CandidateCard'
import { Skeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

type Phase = 'idle' | 'running' | 'done'

export default function ScreeningPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<ScreeningResponse | null>(null)
  const [stats, setStats] = useState<ScreeningStats | null>(null)
  const [topN, setTopN] = useState(20)
  const [filter, setFilter] = useState<string>('all')
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    jobsAPI.get(jobId).then(r => setJob(r.data.data)).catch(() => toast.error('Job not found'))
    // Load existing results
    screeningAPI.results(jobId)
      .then(r => {
        if (r.data.data?.results?.length) {
          setResults({ ...r.data.data, results: r.data.data.results.map((res: any) => ({
            rank: res.rank, candidateId: res.candidateId?._id || res.candidateId,
            candidateName: res.candidateId?.profile ? `${res.candidateId.profile.firstName} ${res.candidateId.profile.lastName}` : 'Unknown',
            candidateEmail: res.candidateId?.profile?.email || '',
            candidateHeadline: res.candidateId?.profile?.headline || '',
            candidateLocation: res.candidateId?.profile?.location || '',
            score: res.score, insight: res.insight,
            features: res.candidateId?.features || {}, source: res.candidateId?.source || ''
          })) })
          setPhase('done')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false))
  }, [jobId])

  const runScreening = async () => {
    setPhase('running')
    setProgress(0)
    toast.loading('AI screening in progress...', { id: 'screening' })

    // Simulate progress bar
    const interval = setInterval(() => {
      setProgress(p => p < 85 ? p + Math.random() * 8 : p)
    }, 600)

    try {
      const res = await screeningAPI.run(jobId, topN)
      clearInterval(interval)
      setProgress(100)
      setResults(res.data.data)
      setPhase('done')
      toast.dismiss('screening')
      toast.success(`✓ ${res.data.data.shortlistedCount} candidates screened in ${(res.data.data.processingTimeMs / 1000).toFixed(1)}s`)

      // Load stats
      screeningAPI.stats(jobId).then(r => setStats(r.data.data)).catch(() => {})
    } catch (err: any) {
      clearInterval(interval)
      setPhase('idle')
      toast.dismiss('screening')
      toast.error(err.response?.data?.message || 'Screening failed')
    }
  }

  const filtered = results?.results.filter(r => {
    if (filter === 'all') return true
    return r.insight.fitForRole === filter
  }) || []

  const FIT_OPTIONS = ['all', 'Strong Fit', 'Good Fit', 'Partial Fit', 'Poor Fit']
  const FIT_COLORS: Record<string, string> = {
    'Strong Fit': '#00C896', 'Good Fit': '#60A5FA', 'Partial Fit': '#F5A623', 'Poor Fit': '#E53E3E'
  }

  const radarData = job?.structuredRequirements ? [
    { subject: 'Skills', weight: Math.round((job.structuredRequirements.weights.skills || 0.4) * 100) },
    { subject: 'Experience', weight: Math.round((job.structuredRequirements.weights.experience || 0.3) * 100) },
    { subject: 'Projects', weight: Math.round((job.structuredRequirements.weights.projects || 0.2) * 100) },
    { subject: 'Education', weight: Math.round((job.structuredRequirements.weights.education || 0.05) * 100) },
    { subject: 'Certs', weight: Math.round((job.structuredRequirements.weights.certifications || 0.05) * 100) },
  ] : []

  const bucketData = stats ? Object.entries(stats.scoreBuckets).map(([range, count]) => ({ range, count })) : []

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <Link href="/jobs" className="text-white/30 text-sm hover:text-white/60 transition-colors">← Jobs</Link>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <h1 className="text-2xl font-display text-white">{job?.title || '...'}</h1>
            <p className="text-white/40 text-sm mt-0.5">{job?.company} · AI Candidate Screening</p>
          </div>
          {phase !== 'running' && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <select value={topN} onChange={e => setTopN(Number(e.target.value))}
                className="input py-2 text-xs w-28" style={{ background: '#1A1F2E' }}>
                {[10, 20, 30, 50].map(n => <option key={n} value={n} style={{ background: '#1A1F2E' }}>Top {n}</option>)}
              </select>
              <button onClick={runScreening} disabled={!job}
                className="btn-primary px-5 py-2.5 disabled:opacity-50">
                {phase === 'done' ? '↻ Re-Screen' : '▶ Run AI Screening'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Running state */}
      {phase === 'running' && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="w-16 h-16 mx-auto mb-5 relative">
            <div className="w-16 h-16 border-2 border-jade/20 rounded-full absolute animate-pulse-ring" />
            <div className="w-16 h-16 border-2 border-jade border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-white font-semibold mb-1">AI Screening In Progress</p>
          <p className="text-white/40 text-sm mb-6">Parsing profiles, computing scores, generating insights...</p>
          <div className="max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
              <span>Processing candidates</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-jade rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Job analysis panel */}
      {job?.structuredRequirements && phase !== 'running' && (
        <div className="card mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-medium text-sm">AI Job Analysis</p>
            <span className="badge bg-jade/10 text-jade border border-jade/15 text-xs">✓ Analyzed</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.structuredRequirements.requiredSkills.map(s => (
                  <span key={s} className="badge bg-jade/8 text-jade/80 text-xs">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Optional Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.structuredRequirements.optionalSkills.map(s => (
                  <span key={s} className="badge bg-white/5 text-white/40 text-xs">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Scoring Weights</p>
              {radarData.length > 0 && (
                <ResponsiveContainer width="100%" height={100}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                    <Radar dataKey="weight" stroke="#00C896" fill="#00C896" fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && results && (
        <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span>{results.totalCandidatesAnalyzed} analyzed</span>
              <span>{results.shortlistedCount} shortlisted</span>
              <span>{(results.processingTimeMs / 1000).toFixed(1)}s</span>
              {stats && <span>Avg score: {stats.scoreStats.avg}</span>}
            </div>
            {/* Filter */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {FIT_OPTIONS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
                  {f === 'all' ? `All (${results.results.length})` : f.replace(' Fit', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Score distribution */}
          {stats && bucketData.length > 0 && (
            <div className="card mb-5">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Score Distribution</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={bucketData} barSize={28}>
                  <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {bucketData.map((d, i) => (
                      <Cell key={i} fill={i === 0 ? '#00C896' : i === 1 ? '#60A5FA' : i === 2 ? '#F5A623' : '#E53E3E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Candidate cards */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-white/30 py-8 text-sm">No candidates match this filter</p>
            ) : filtered.map(result => (
              <CandidateCard
                key={result.candidateId}
                result={result}
                weights={job?.structuredRequirements?.weights as any}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty — no existing results */}
      {!loadingExisting && phase === 'idle' && (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">◎</p>
          <p className="text-white font-medium mb-1">Ready to screen candidates</p>
          <p className="text-white/40 text-sm mb-5">
            {job?.structuredRequirements ? 'Job requirements analyzed ✓ — click Run AI Screening to start' : 'AI is analyzing job requirements... once done, run screening'}
          </p>
          <button onClick={runScreening} disabled={!job} className="btn-primary inline-flex">
            ▶ Run AI Screening
          </button>
        </div>
      )}
    </div>
  )
}
