'use client'
import { useEffect, useState, useCallback } from 'react'
import { candidatesAPI, jobsAPI } from '@/lib/api'
import { Candidate, Job } from '@/types'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import UploadModal from '@/components/candidates/UploadModal'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useSearchParams } from 'next/navigation'

/* FIX: use Tailwind colors that exist in config */
const LEVEL_COLOR: Record<string, string> = {
  Expert:'text-green',    Advanced:'text-blue-400',
  Intermediate:'text-amber', Beginner:'text-body-muted',
}
const SOURCE_LABEL: Record<string, string> = {
  umurava_profile:'Umurava', external_cv:'PDF', external_csv:'CSV', external_docx:'Word',
}
const SOURCE_DOT: Record<string, string> = {
  umurava_profile:'bg-green', external_cv:'bg-blue-400', external_csv:'bg-amber', external_docx:'bg-purple-400',
}

export default function CandidatesPage() {
  const searchParams = useSearchParams()
  const initJobId = searchParams.get('jobId') || ''

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs,       setJobs]       = useState<Job[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [total,      setTotal]      = useState(0)
  const [view,       setView]       = useState<'list'|'grid'>('list')

  const [filterJob,    setFilterJob]    = useState(initJobId)
  const [filterSource, setFilterSource] = useState('')
  const [filterLevel,  setFilterLevel]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState('createdAt')
  const [order,        setOrder]        = useState<'desc'|'asc'>('desc')

  const user    = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const load = useCallback(() => {
    setLoading(true)
    const params: any = { limit: 100 }
    if (filterJob)    params.jobId  = filterJob
    if (filterSource) params.source = filterSource
    if (search)       params.search = search
    if (sort)         params.sort   = sort
    params.order = order
    candidatesAPI.list(params)
      .then(r => { setCandidates(r.data.data || []); setTotal(r.data.total || 0) })
      .catch(() => toast.error('Failed to load candidates'))
      .finally(() => setLoading(false))
  }, [filterJob, filterSource, search, sort, order])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    jobsAPI.list().then(r => setJobs(r.data.data || [])).catch(() => {})
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Remove ${name}?`)) return
    await candidatesAPI.delete(id)
    toast.success('Candidate removed')
    load()
  }

  const displayed = filterLevel
    ? candidates.filter(c => c.features.seniorityLevel === filterLevel)
    : candidates

  const hasFilters = !!(filterJob || filterSource || filterLevel || search)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">

      {/* Header — FIX: use text-body-primary instead of text-white */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-body-primary">Candidates</h1>
          <p className="text-body-muted text-sm mt-0.5">
            {total} total
            {isAdmin && <span className="ml-2 text-xs" style={{ color:'#059669' }}>· All recruiters</span>}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 10V2M3 6l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Upload
        </button>
      </div>

      {/* Filter bar — FIX: glass adapts to theme, selects use CSS var */}
      <div className="glass rounded-2xl p-3 mb-5 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-body-muted" width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className="input pl-8 py-2 text-xs"
            placeholder="Search name, title, location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* FIX: all selects use .input class — no hardcoded background */}
        <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
          className="input py-2 text-xs max-w-[180px]">
          <option value="">All jobs</option>
          <option value="none">No job assigned</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
        </select>

        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="input py-2 text-xs max-w-[140px]">
          <option value="">All sources</option>
          <option value="umurava_profile">Umurava</option>
          <option value="external_cv">PDF</option>
          <option value="external_csv">CSV</option>
          <option value="external_docx">Word</option>
        </select>

        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          className="input py-2 text-xs max-w-[140px]">
          <option value="">All levels</option>
          <option value="Junior">Junior</option>
          <option value="Mid">Mid</option>
          <option value="Senior">Senior</option>
          <option value="Expert">Expert</option>
        </select>

        <select value={`${sort}:${order}`}
          onChange={e => { const [s,o] = e.target.value.split(':'); setSort(s); setOrder(o as 'asc'|'desc') }}
          className="input py-2 text-xs max-w-[160px]">
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="experience:desc">Most experience</option>
          <option value="experience:asc">Least experience</option>
          <option value="name:asc">Name A–Z</option>
        </select>

        {hasFilters && (
          <button onClick={() => { setFilterJob(''); setFilterSource(''); setFilterLevel(''); setSearch('') }}
            className="text-xs text-body-muted hover:text-body-primary transition-colors px-2 py-2">
            Clear
          </button>
        )}

        {/* View toggle */}
        <div className="flex gap-1 ml-auto p-1 rounded-xl" style={{ background:'var(--bg)', border:'1px solid var(--border)' }}>
          {(['list','grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: view === v ? 'var(--bg-card)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: view === v ? 'var(--shadow-card)' : 'none',
              }}>
              {v === 'list'
                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2h10M1 6h10M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".6"/><rect x="7" y="1" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".6"/><rect x="1" y="7" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".6"/><rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".6"/></svg>
              }
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
          {Array(6).fill(0).map((_,i) => <Skeleton key={i} className={view === 'grid' ? 'h-40 rounded-2xl' : 'h-16 rounded-xl'} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background:'var(--umu-blue-bg)', border:'1px solid var(--umu-blue-faint)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="4" stroke="var(--umu-blue)" strokeOpacity=".5" strokeWidth="1.5"/>
              <path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="var(--umu-blue)" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-body-primary font-semibold mb-1">No candidates found</p>
          <p className="text-body-muted text-sm mb-5">
            {hasFilters ? 'Try adjusting your filters' : 'Upload your first candidate to get started'}
          </p>
          {!hasFilters && <button onClick={() => setShowUpload(true)} className="btn-primary">Upload Candidates</button>}
        </div>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {displayed.map((c, i) => {
            const job = c.jobId as any
            return (
              <Link key={c._id} href={`/candidates/${c._id}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-all animate-fade-up group card-sm"
                style={{ animationDelay:`${i*25}ms` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--umu-blue-faint)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ background:'rgba(37,99,235,0.1)', color:'var(--umu-blue)', border:'1px solid rgba(37,99,235,0.15)' }}>
                  {c.profile.firstName[0]}{c.profile.lastName[0]}
                </div>
                {/* Name + headline — FIX: use CSS vars */}
                <div className="flex-1 min-w-0">
                  <p className="text-body-primary text-sm font-medium truncate">
                    {c.profile.firstName} {c.profile.lastName}
                  </p>
                  <p className="text-body-muted text-xs truncate">{c.profile.headline}</p>
                </div>
                {job?.title && <span className="tag hidden sm:inline-flex flex-shrink-0 max-w-32 truncate">{job.title}</span>}
                <div className="hidden md:flex items-center gap-3 text-[11px] text-body-muted flex-shrink-0 mono">
                  <span>{c.features.totalYearsExperience.toFixed(1)}y</span>
                  <span>{c.features.seniorityLevel}</span>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SOURCE_DOT[c.source] || 'bg-gray-300'}`} title={SOURCE_LABEL[c.source]} />
                <div className="hidden lg:flex gap-1 flex-shrink-0">
                  {c.profile.skills.slice(0, 3).map(s => (
                    <span key={s.name} className={`text-[10px] px-1.5 py-0.5 rounded mono tag ${LEVEL_COLOR[s.level] || 'text-body-muted'}`}>{s.name}</span>
                  ))}
                </div>
                <button onClick={e => handleDelete(e, c._id, `${c.profile.firstName} ${c.profile.lastName}`)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-body-muted hover:text-red transition-all flex-shrink-0"
                  style={{ background:'transparent' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((c, i) => {
            const job = c.jobId as any
            return (
              <Link key={c._id} href={`/candidates/${c._id}`}
                className="card transition-all animate-fade-up group"
                style={{ animationDelay:`${i*25}ms` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--umu-blue-faint)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold"
                      style={{ background:'rgba(37,99,235,0.1)', color:'var(--umu-blue)', border:'1px solid rgba(37,99,235,0.15)' }}>
                      {c.profile.firstName[0]}{c.profile.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-primary text-sm font-medium truncate">{c.profile.firstName} {c.profile.lastName}</p>
                      <p className="text-body-muted text-[11px]">{c.features.seniorityLevel} · {c.features.totalYearsExperience.toFixed(1)}y</p>
                    </div>
                  </div>
                  <button onClick={e => handleDelete(e, c._id, `${c.profile.firstName} ${c.profile.lastName}`)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-body-muted hover:text-red transition-all">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <p className="text-body-muted text-xs truncate mb-3">{c.profile.headline}</p>
                {job?.title && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="var(--umu-blue)" strokeOpacity=".6" strokeWidth="1"/><path d="M3 2V1.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V2" stroke="var(--umu-blue)" strokeOpacity=".6" strokeWidth="1"/></svg>
                    <span className="text-[11px] truncate" style={{ color:'var(--umu-blue)' }}>{job.title}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {c.profile.skills.slice(0, 4).map(s => (
                    <span key={s.name} className={`text-[10px] px-1.5 py-0.5 rounded mono tag ${LEVEL_COLOR[s.level] || 'text-body-muted'}`}>{s.name}</span>
                  ))}
                  {c.profile.skills.length > 4 && <span className="text-[10px] text-body-muted mono">+{c.profile.skills.length - 4}</span>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop:'1px solid var(--border)' }}>
                  <span className="text-[10px] text-body-muted">{c.profile.location}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${SOURCE_DOT[c.source] || 'bg-gray-300'}`} />
                    <span className="text-[10px] text-body-muted">{SOURCE_LABEL[c.source]}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => { setShowUpload(false); load() }} />}
    </div>
  )
}