'use client'
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { candidatesAPI, jobsAPI } from '@/lib/api'
import { Job } from '@/types'
import toast from 'react-hot-toast'

interface Props { onClose: () => void; preselectedJobId?: string }
type Tab = 'cv' | 'spreadsheet' | 'umurava'

export default function UploadModal({ onClose, preselectedJobId }: Props) {
  const [tab,         setTab]         = useState<Tab>('cv')
  const [jobId,       setJobId]       = useState(preselectedJobId || '')
  const [uploading,   setUploading]   = useState(false)
  const [files,       setFiles]       = useState<File[]>([])
  const [umuravaJson, setUmuravaJson] = useState('')
  const [jobs,        setJobs]        = useState<Job[]>([])
  const [results,     setResults]     = useState<{ name: string; status: 'ok'|'err'; msg?: string }[]>([])

  useEffect(() => {
    jobsAPI.list().then(r => setJobs(r.data.data || [])).catch(() => {})
  }, [])

  const acceptCV    = { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/msword': ['.doc'] }
  const acceptSheet = { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }

  const onDrop = useCallback((dropped: File[]) => {
    setFiles(prev => { const ex = new Set(prev.map(f => f.name)); return [...prev, ...dropped.filter(f => !ex.has(f.name))] })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: tab !== 'umurava',
    accept: tab === 'cv' ? acceptCV : acceptSheet,
  })

  const removeFile = (name: string) => setFiles(p => p.filter(f => f.name !== name))

  const handleUpload = async () => {
    if (!jobId) { toast.error('Please select a job to assign candidates to'); return }
    if (tab === 'umurava' && !umuravaJson) { toast.error('Paste JSON first'); return }
    if (tab !== 'umurava' && files.length === 0) { toast.error('Select at least one file'); return }

    setUploading(true); setResults([])
    try {
      if (tab === 'cv') {
        const res  = await candidatesAPI.uploadFiles(files, jobId)
        const data = res.data.data
        const ok   = (data.candidates || []).map((c: any) => ({ name: c.file, status: 'ok' as const }))
        const err  = (data.errors || []).map((e: string) => {
          const [f, ...rest] = e.split(': ')
          return { name: f, status: 'err' as const, msg: rest.join(': ') }
        })
        setResults([...ok, ...err])
        toast.success(`${data.count} candidate(s) uploaded!`)
      } else if (tab === 'spreadsheet') {
        const res = await candidatesAPI.uploadSpreadsheet(files, jobId)
        setResults([{ name: files.map(f => f.name).join(', '), status: 'ok' }])
        toast.success(`${res.data.data.count} candidates imported!`)
      } else {
        const parsed = JSON.parse(umuravaJson)
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        await candidatesAPI.bulkUmurava(arr, jobId)
        setResults([{ name: `${arr.length} Umurava profile(s)`, status: 'ok' }])
        toast.success(`${arr.length} profile(s) imported!`)
      }
      setTimeout(() => onClose(), 1500)
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const selectedJob = jobs.find(j => j._id === jobId)

  const TABS = [
    { id: 'cv' as Tab,          label: 'PDF / Word',   desc: 'CV files' },
    { id: 'spreadsheet' as Tab, label: 'CSV / Excel',  desc: 'Bulk import' },
    { id: 'umurava' as Tab,     label: 'Umurava JSON', desc: 'Official schema' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div className="animate-scale-in" style={{
        position: 'relative', width: '100%', maxWidth: 520,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Upload Candidates
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Candidates must be assigned to a job</p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Job selector */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">
            Assign to Job <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>
          </label>
          <select
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            className="input"
            style={{
              borderColor: !jobId ? 'rgba(239,68,68,0.4)' : jobId ? 'rgba(0,200,150,0.3)' : 'var(--border)',
            }}
          >
            <option value="">— Select a job first —</option>
            {jobs.map(j => (
              <option key={j._id} value={j._id}>
                {j.title} · {j.company}
              </option>
            ))}
          </select>

          {!jobId && (
            <p style={{ fontSize: 11, color: '#EF4444', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" stroke="currentColor"/>
                <path d="M5 3v2.5M5 7h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              You must select a job before uploading candidates
            </p>
          )}

          {selectedJob && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l2.5 2.5L10 3" stroke="#00C896" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Uploading to: <strong style={{ color: '#00C896' }}>{selectedJob.title}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          borderRadius: 12, background: 'var(--bg)',
          border: '1px solid var(--border)', marginBottom: 20,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFiles([]) }} style={{
              flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? 'var(--shadow-card)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        {tab !== 'umurava' ? (
          <>
            <div {...getRootProps()} style={{
              borderRadius: 12, border: `2px dashed ${isDragActive ? '#00C896' : files.length ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
              padding: 24, textAlign: 'center', cursor: 'pointer',
              background: isDragActive ? 'rgba(0,200,150,0.05)' : files.length ? 'rgba(0,200,150,0.03)' : 'var(--bg)',
              transition: 'all 0.2s',
            }}>
              <input {...getInputProps()} />
              <svg style={{ width: 32, height: 32, margin: '0 auto 8px', color: 'var(--text-muted)' }} viewBox="0 0 32 32" fill="none">
                <path d="M16 22V10M10 16l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 26h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {isDragActive ? 'Drop files here' : 'Drop files here or click to browse'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {tab === 'cv' ? 'PDF, Word (.docx) — multiple files OK' : 'CSV or Excel — multiple files OK'}
              </p>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map(f => (
                  <div key={f.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                  }}>
                    <svg style={{ color: '#00C896', flexShrink: 0 }} width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1"/>
                      <path d="M3.5 6l1.5 1.5L8.5 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>{(f.size/1024).toFixed(0)}KB</span>
                    <button onClick={() => removeFile(f.name)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', flexShrink: 0, padding: 2,
                    }}>
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </>
        ) : (
          <textarea
            className="input"
            style={{ minHeight: 130, resize: 'none', fontFamily: 'monospace', fontSize: 12 }}
            placeholder={'Paste Umurava Talent Profile JSON\n[{ "firstName": "...", "skills": [...] }]'}
            value={umuravaJson}
            onChange={e => setUmuravaJson(e.target.value)}
          />
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="animate-slide-down" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 10, fontSize: 12,
                background: r.status === 'ok' ? 'rgba(0,200,150,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${r.status === 'ok' ? 'rgba(0,200,150,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: r.status === 'ok' ? '#059669' : '#DC2626',
              }}>
                <span>{r.status === 'ok' ? '✓' : '✕'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                {r.msg && <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.msg}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleUpload}
            disabled={uploading || !jobId || (tab !== 'umurava' ? files.length === 0 : !umuravaJson)}
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >
            {uploading ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }} />
                Uploading...
              </>
            ) : `Upload ${files.length > 1 ? `${files.length} Files` : tab === 'umurava' ? 'Profiles' : 'File'}`}
          </button>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '12px 20px' }}>
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}