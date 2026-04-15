'use client'
import { useEffect, useState, useCallback } from 'react'
import { candidatesAPI } from '@/lib/api'
import { Candidate } from '@/types'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import UploadModal from '@/components/candidates/UploadModal'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [total, setTotal] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    candidatesAPI.list({ limit: 50 })
      .then(r => { setCandidates(r.data.data || []); setTotal(r.data.total || 0) })
      .catch(() => toast.error('Failed to load candidates'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return
    await candidatesAPI.delete(id)
    toast.success('Candidate removed')
    load()
  }

  const LEVEL_COLOR: Record<string, string> = {
    Expert: 'text-jade', Advanced: 'text-blue-400',
    Intermediate: 'text-amber', Beginner: 'text-white/40'
  }

  const SOURCE_LABEL: Record<string, string> = {
    umurava_profile: 'Umurava', external_cv: 'PDF CV', external_csv: 'Spreadsheet'
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display text-white">Candidates</h1>
          <p className="text-white/40 text-sm mt-0.5">{total} total candidates</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <span>↑</span> Upload Candidates
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : candidates.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">◈</p>
          <p className="text-white font-medium mb-1">No candidates yet</p>
          <p className="text-white/40 text-sm mb-5">Upload CVs, spreadsheets, or Umurava talent profiles</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex">↑ Upload Candidates</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {candidates.map((c, i) => (
            <div key={c._id} className="card hover:border-white/10 transition-all animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-jade/10 border border-jade/20 flex items-center justify-center text-jade text-sm font-bold flex-shrink-0">
                    {c.profile.firstName[0]}{c.profile.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {c.profile.firstName} {c.profile.lastName}
                    </p>
                    <p className="text-white/40 text-xs truncate">{c.profile.headline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="badge bg-white/5 text-white/35 text-xs">{SOURCE_LABEL[c.source] || c.source}</span>
                  <button onClick={() => handleDelete(c._id, `${c.profile.firstName} ${c.profile.lastName}`)}
                    className="text-white/20 hover:text-crimson transition-colors text-xs px-1.5 py-1 rounded">✕</button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/30 mb-3">
                <span>{c.features.totalYearsExperience.toFixed(1)}y exp</span>
                <span>{c.features.seniorityLevel}</span>
                <span>{c.features.projectCount} projects</span>
                <span>{c.profile.location}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {c.profile.skills.slice(0, 4).map(s => (
                  <span key={s.name} className={`badge bg-white/5 text-xs ${LEVEL_COLOR[s.level] || 'text-white/50'}`}>
                    {s.name}
                  </span>
                ))}
                {c.profile.skills.length > 4 && (
                  <span className="badge bg-white/5 text-white/25 text-xs">+{c.profile.skills.length - 4}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => { setShowUpload(false); load() }} />}
    </div>
  )
}
