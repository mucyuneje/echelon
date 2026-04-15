'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { jobsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', company: '', description: '', location: '', jobType: 'Full-time'
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.company || !form.description) {
      toast.error('Title, company, and description are required')
      return
    }
    setLoading(true)
    try {
      const res = await jobsAPI.create(form)
      toast.success('Job created! AI is analyzing requirements in the background.')
      router.push('/jobs')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/jobs" className="text-white/30 text-sm hover:text-white/60 transition-colors">← Back to Jobs</Link>
        <h1 className="text-2xl font-display text-white mt-3">Create New Job</h1>
        <p className="text-white/40 text-sm mt-1">AI will automatically analyze and structure the requirements</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card space-y-5">
          <h2 className="text-white font-semibold text-sm border-b border-white/6 pb-4">Job Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Job Title *</label>
              <input className="input" placeholder="Senior Backend Engineer" value={form.title} onChange={set('title')} required />
            </div>
            <div>
              <label className="label">Company *</label>
              <input className="input" placeholder="Umurava Africa" value={form.company} onChange={set('company')} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="Kigali, Rwanda (Remote-friendly)" value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Job Type</label>
              <select className="input" value={form.jobType} onChange={set('jobType')}>
                {['Full-time', 'Part-time', 'Contract', 'Remote'].map(t => (
                  <option key={t} value={t} style={{ background: '#1A1F2E' }}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Job Description *</label>
            <textarea className="input min-h-48 resize-none"
              placeholder="Describe the role, responsibilities, requirements, and what makes a great candidate...&#10;&#10;The more detail you provide, the better the AI can analyze and match candidates."
              value={form.description} onChange={set('description')} required />
            <p className="text-white/25 text-xs mt-1.5">AI will extract required skills, experience level, and scoring weights from this description.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 disabled:opacity-60">
            {loading ? <><span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />Creating...</> : '✦ Create Job'}
          </button>
          <Link href="/jobs" className="btn-secondary px-6 py-2.5">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
