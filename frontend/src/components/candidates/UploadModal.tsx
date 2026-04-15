'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { candidatesAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props { onClose: () => void }

type Tab = 'pdf' | 'spreadsheet' | 'umurava'

export default function UploadModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('pdf')
  const [jobId, setJobId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [umuravaJson, setUmuravaJson] = useState('')

  const onDrop = useCallback((files: File[]) => { setFile(files[0]) }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: tab === 'pdf' ? { 'application/pdf': ['.pdf'] } : {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    }
  })

  const handleUpload = async () => {
    setUploading(true)
    try {
      if (tab === 'pdf' && file) {
        await candidatesAPI.uploadCV(file, jobId || undefined)
        toast.success('CV uploaded and parsed by AI!')
      } else if (tab === 'spreadsheet' && file) {
        const res = await candidatesAPI.uploadSpreadsheet(file, jobId || undefined)
        toast.success(`${res.data.data.count} candidates imported!`)
      } else if (tab === 'umurava' && umuravaJson) {
        const parsed = JSON.parse(umuravaJson)
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        await candidatesAPI.bulkUmurava(arr)
        toast.success(`${arr.length} Umurava profile(s) imported!`)
      }
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const TABS: { id: Tab; label: string; desc: string }[] = [
    { id: 'pdf', label: 'PDF Resume', desc: 'Single CV — AI extracts all data' },
    { id: 'spreadsheet', label: 'CSV / Excel', desc: 'Bulk import from spreadsheet' },
    { id: 'umurava', label: 'Umurava Profile', desc: 'JSON talent profile (official schema)' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-lg p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Upload Candidates</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFile(null) }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t.id ? 'bg-jade text-ink' : 'text-white/40 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-white/30 text-xs mb-4">{TABS.find(t => t.id === tab)?.desc}</p>

        {/* Drop zone */}
        {tab !== 'umurava' ? (
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-jade bg-jade/5' : file ? 'border-jade/40 bg-jade/5' : 'border-white/10 hover:border-white/20'}`}>
            <input {...getInputProps()} />
            {file ? (
              <div>
                <p className="text-jade text-sm font-medium">✓ {file.name}</p>
                <p className="text-white/30 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-3xl mb-2">↑</p>
                <p className="text-white/50 text-sm">Drop {tab === 'pdf' ? 'a PDF' : 'CSV or Excel file'} here</p>
                <p className="text-white/25 text-xs mt-1">or click to browse</p>
              </div>
            )}
          </div>
        ) : (
          <textarea
            className="input min-h-36 resize-none font-mono text-xs"
            placeholder='Paste Umurava Talent Profile JSON here...&#10;[{ "firstName": "...", "skills": [...] }]'
            value={umuravaJson}
            onChange={e => setUmuravaJson(e.target.value)}
          />
        )}

        <div className="mt-4">
          <label className="label">Job ID (optional)</label>
          <input className="input" placeholder="Associate with a specific job" value={jobId} onChange={e => setJobId(e.target.value)} />
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={handleUpload} disabled={uploading || (!file && !umuravaJson)}
            className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50">
            {uploading ? <><span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" /> Uploading...</> : '↑ Upload'}
          </button>
          <button onClick={onClose} className="btn-secondary px-5">Cancel</button>
        </div>
      </div>
    </div>
  )
}
