'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { jobsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'

// ── Toolbar button ──────────────────────────────────────────────────────────
function ToolBtn({ label, title, active, onClick }: { label: string; title: string; active?: boolean; onClick: () => void }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        minWidth: 28, height: 28, padding: '0 6px',
        borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 600, lineHeight: 1,
        background: active
          ? (isDark ? 'rgba(37,99,235,0.25)' : '#DBEAFE')
          : 'transparent',
        color: active
          ? '#2563EB'
          : (isDark ? 'rgba(255,255,255,0.55)' : '#64748B'),
        transition: 'all 0.12s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}

// ── Divider ─────────────────────────────────────────────────────────────────
function Divider({ isDark }: { isDark: boolean }) {
  return <div style={{ width: 1, height: 18, background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', margin: '0 4px' }} />
}

// ── Rich text editor ─────────────────────────────────────────────────────────
function RichEditor({ value, onChange }: { value: string; onChange: (html: string, text: string) => void }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    updateFormats()
  }

  const updateFormats = useCallback(() => {
    const active = new Set<string>()
    if (document.queryCommandState('bold'))          active.add('bold')
    if (document.queryCommandState('italic'))        active.add('italic')
    if (document.queryCommandState('underline'))     active.add('underline')
    if (document.queryCommandState('insertUnorderedList')) active.add('ul')
    if (document.queryCommandState('insertOrderedList'))   active.add('ol')
    setActiveFormats(active)
  }, [])

  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    const text = el.innerText || ''
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    setWordCount(words)
    setCharCount(text.length)
    onChange(html, text)
    updateFormats()
  }, [onChange, updateFormats])

  // Paste as plain text
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey)) {
      if (e.key === 'b') { e.preventDefault(); exec('bold') }
      if (e.key === 'i') { e.preventDefault(); exec('italic') }
      if (e.key === 'u') { e.preventDefault(); exec('underline') }
    }
  }

  const insertTemplate = (tpl: string) => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0)
      range.collapse(false)
    }
    document.execCommand('insertHTML', false, tpl)
    handleInput()
  }

  const TEMPLATES = [
    {
      label: '📋 Standard',
      html: `<b>About the Role</b><br>Brief overview of the position...<br><br><b>Responsibilities</b><ul><li>Lead development of...</li><li>Collaborate with...</li><li>Ensure quality of...</li></ul><b>Requirements</b><ul><li>X+ years of experience in...</li><li>Strong knowledge of...</li><li>Experience with...</li></ul><b>Nice to Have</b><ul><li>Familiarity with...</li></ul><b>What We Offer</b><ul><li>Competitive salary</li><li>Remote-friendly</li></ul>`
    },
    {
      label: '🚀 Tech Role',
      html: `<b>The Opportunity</b><br>We're looking for a talented engineer to join our team...<br><br><b>You'll be responsible for</b><ul><li>Building scalable backend services</li><li>Reviewing code and mentoring juniors</li><li>Participating in system design discussions</li></ul><b>Tech Stack</b><ul><li>Languages: ...</li><li>Frameworks: ...</li><li>Infrastructure: ...</li></ul><b>Must Have</b><ul><li>X+ years professional experience</li><li>CS degree or equivalent</li></ul>`
    },
  ]

  return (
    <div style={{
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
      borderRadius: 12, overflow: 'hidden',
      background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      transition: 'border-color 0.15s',
    }}
      onFocus={() => {
        const el = editorRef.current?.parentElement?.parentElement
        if (el) el.style.borderColor = '#2563EB'
      }}
      onBlur={() => {
        const el = editorRef.current?.parentElement?.parentElement
        if (el) el.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        padding: '8px 10px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9'}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
      }}>
        <ToolBtn label="B" title="Bold (⌘B)" active={activeFormats.has('bold')} onClick={() => exec('bold')} />
        <ToolBtn label="I" title="Italic (⌘I)" active={activeFormats.has('italic')} onClick={() => exec('italic')} />
        <ToolBtn label="U" title="Underline (⌘U)" active={activeFormats.has('underline')} onClick={() => exec('underline')} />
        <Divider isDark={isDark} />
        <ToolBtn label="H2" title="Heading" active={false} onClick={() => exec('formatBlock', '<h3>')} />
        <ToolBtn label="¶" title="Paragraph" active={false} onClick={() => exec('formatBlock', '<p>')} />
        <Divider isDark={isDark} />
        <ToolBtn label="• List" title="Bullet list" active={activeFormats.has('ul')} onClick={() => exec('insertUnorderedList')} />
        <ToolBtn label="1. List" title="Numbered list" active={activeFormats.has('ol')} onClick={() => exec('insertOrderedList')} />
        <Divider isDark={isDark} />
        <ToolBtn label="—" title="Horizontal rule" active={false} onClick={() => exec('insertHorizontalRule')} />
        <ToolBtn label="⎌" title="Undo" active={false} onClick={() => exec('undo')} />
        <ToolBtn label="⎌↩" title="Redo" active={false} onClick={() => exec('redo')} />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Templates */}
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.innerHTML = t.html
                handleInput()
              }
            }}
            style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
              background: 'transparent', cursor: 'pointer',
              color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B',
              whiteSpace: 'nowrap', transition: 'all 0.12s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateFormats}
        onMouseUp={updateFormats}
        onPaste={handlePaste}
        data-placeholder="Describe the role, responsibilities, and requirements…"
        style={{
          minHeight: 280,
          maxHeight: 480,
          overflowY: 'auto',
          padding: '16px 18px',
          outline: 'none',
          fontSize: 13,
          lineHeight: 1.75,
          color: isDark ? '#E2E8F0' : '#1E293B',
          caretColor: '#2563EB',
        }}
      />

      {/* Footer: word/char count */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC'}`,
        background: isDark ? 'rgba(255,255,255,0.01)' : '#FAFAFA',
      }}>
        <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.25)' : '#94A3B8' }}>
          AI will extract skills & requirements from this description
        </span>
        <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.25)' : '#94A3B8', fontFamily: 'DM Mono, monospace' }}>
          {wordCount} words · {charCount} chars
        </span>
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: ${isDark ? 'rgba(255,255,255,0.2)' : '#94A3B8'};
          pointer-events: none;
        }
        [contenteditable] h3 {
          font-size: 14px; font-weight: 700;
          color: ${isDark ? '#F1F5F9' : '#0F172A'};
          margin: 14px 0 6px;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 20px; margin: 6px 0;
        }
        [contenteditable] li { margin: 3px 0; }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] hr { border: none; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}; margin: 14px 0; }
        [contenteditable]::-webkit-scrollbar { width: 4px; }
        [contenteditable]::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}; border-radius: 4px; }
      `}</style>
    </div>
  )
}

// ── AI hint badge ─────────────────────────────────────────────────────────────
function AiBadge({ text }: { text: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'DM Mono, monospace',
      background: 'rgba(0,200,150,0.08)', color: '#059669',
      border: '1px solid rgba(0,200,150,0.2)', whiteSpace: 'nowrap',
    }}>
      ✦ {text}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewJobPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', company: '', location: '', jobType: 'Full-time',
    description: '', descriptionHtml: '',
  })
  const [step, setStep] = useState<'details' | 'description'>('details')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const detailsFilled = form.title && form.company

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.company || !form.description) {
      toast.error('Title, company, and description are required')
      return
    }
    setLoading(true)
    try {
      await jobsAPI.create({ ...form })
      toast.success('Job created! AI is analyzing requirements…')
      router.push('/jobs')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job')
    } finally { setLoading(false) }
  }

  const textPri = isDark ? '#F1F5F9' : '#0F172A'
  const textSec = isDark ? '#94A3B8' : '#64748B'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
  const cardBg  = isDark ? 'rgba(13,18,26,0.8)' : '#FFFFFF'

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/jobs" style={{ fontSize: 13, color: textSec, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          ← Back to Jobs
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: textPri, marginBottom: 4 }}>Create New Job</h1>
            <p style={{ fontSize: 13, color: textSec }}>AI will automatically analyze and structure requirements from your description.</p>
          </div>
          <AiBadge text="AI Powered" />
        </div>
      </div>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `1px solid ${border}` }}>
        {([['details', '1', 'Basic Details'], ['description', '2', 'Job Description']] as const).map(([id, num, label]) => {
          const active = step === id
          const done   = id === 'details' ? detailsFilled : !!form.description
          return (
            <button
              key={id}
              type="button"
              onClick={() => { if (id === 'description' && !detailsFilled) { toast.error('Fill in title and company first'); return } setStep(id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -1,
                color: active ? '#2563EB' : textSec,
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#2563EB' : (isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'),
                color: done ? 'white' : textSec,
              }}>
                {done && !active ? '✓' : num}
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={submit}>

        {/* Step 1: Basic Details */}
        {step === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.2s ease both' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: textPri, margin: 0 }}>Position Details</h2>
                <AiBadge text="Auto-analyzed" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Job Title *</label>
                    <input className="input" placeholder="e.g. Senior Backend Engineer" value={form.title} onChange={set('title')} required />
                  </div>
                  <div>
                    <label className="label">Company *</label>
                    <input className="input" placeholder="e.g. Umurava Africa" value={form.company} onChange={set('company')} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Location</label>
                    <input className="input" placeholder="e.g. Kigali, Rwanda (Remote-friendly)" value={form.location} onChange={set('location')} />
                  </div>
                  <div>
                    <label className="label">Job Type</label>
                    <select className="input" value={form.jobType} onChange={set('jobType')}>
                      {['Full-time', 'Part-time', 'Contract', 'Remote'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview card */}
            {(form.title || form.company) && (
              <div style={{
                background: isDark ? 'rgba(37,99,235,0.05)' : '#EFF6FF',
                border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#BFDBFE'}`,
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                animation: 'fadeUp 0.2s ease both',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="4" width="13" height="10" rx="1.5" stroke="#2563EB" strokeWidth="1.3"/>
                    <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: textPri }}>{form.title || 'Job Title'}</p>
                  <p style={{ fontSize: 12, color: textSec }}>{[form.company, form.location, form.jobType].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { if (!detailsFilled) { toast.error('Fill in title and company'); return } setStep('description') }}
                className="btn-primary"
                style={{ padding: '10px 24px' }}
              >
                Next: Write Description →
              </button>
              <Link href="/jobs" className="btn-secondary" style={{ padding: '10px 24px' }}>Cancel</Link>
            </div>
          </div>
        )}

        {/* Step 2: Description */}
        {step === 'description' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.2s ease both' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: textPri, margin: 0 }}>Job Description</h2>
                  <p style={{ fontSize: 12, color: textSec, marginTop: 3 }}>Use the toolbar to format. AI extracts skills & requirements automatically.</p>
                </div>
                <AiBadge text="Skills extracted automatically" />
              </div>

              <RichEditor
                value={form.descriptionHtml}
                onChange={(html, text) => setForm(f => ({ ...f, descriptionHtml: html, description: text }))}
              />
            </div>

            {/* AI hint */}
            <div style={{
              background: isDark ? 'rgba(0,200,150,0.04)' : 'rgba(5,150,105,0.04)',
              border: `1px solid ${isDark ? 'rgba(0,200,150,0.15)' : 'rgba(5,150,105,0.2)'}`,
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>✦</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#34D399' : '#059669', marginBottom: 3 }}>AI will extract from your description:</p>
                <p style={{ fontSize: 12, color: textSec }}>Required skills · Experience level · Seniority · Scoring weights · Key responsibilities</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 28px' }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Creating…
                  </span>
                ) : '✦ Create Job'}
              </button>
              <button type="button" onClick={() => setStep('details')} className="btn-secondary" style={{ padding: '10px 20px' }}>
                ← Back
              </button>
              <Link href="/jobs" className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</Link>
            </div>
          </div>
        )}

      </form>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  )
}