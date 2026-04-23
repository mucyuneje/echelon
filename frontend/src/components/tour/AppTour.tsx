'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/components/ThemeProvider'

export interface TourStep {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface Props {
  steps: TourStep[]
  onFinish: () => void
  onSkip: () => void
  run: boolean
}

const TOUR_KEY = 'echelon_tour_done'

export function useAppTour() {
  const [run, setRun] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(TOUR_KEY)) {
      setTimeout(() => setRun(true), 800)
    }
  }, [])
  const finish = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1')
    setRun(false)
  }, [])
  const restart = useCallback(() => setRun(true), [])
  return { run, finish, restart }
}

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  return el.getBoundingClientRect()
}

export default function AppTour({ steps, onFinish, onSkip, run }: Props) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (!run) return; setStep(0) }, [run])

  useEffect(() => {
    if (!run || !mounted) return
    const measure = () => {
      const r = getRect(steps[step]?.target)
      setRect(r)
      const el = document.querySelector(steps[step]?.target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [step, run, mounted, steps])

  if (!run || !mounted) return null

  const current = steps[step]
  const total = steps.length
  const isLast = step === total - 1
  const placement = current?.placement || 'bottom'

  const TIP_W = 300, TIP_H = 160
  let tipX = 0, tipY = 0
  if (rect) {
    if (placement === 'bottom') { tipX = rect.left + rect.width / 2 - TIP_W / 2; tipY = rect.bottom + 12 }
    if (placement === 'top')    { tipX = rect.left + rect.width / 2 - TIP_W / 2; tipY = rect.top - TIP_H - 12 }
    if (placement === 'right')  { tipX = rect.right + 12; tipY = rect.top + rect.height / 2 - TIP_H / 2 }
    if (placement === 'left')   { tipX = rect.left - TIP_W - 12; tipY = rect.top + rect.height / 2 - TIP_H / 2 }
    tipX = Math.max(12, Math.min(window.innerWidth - TIP_W - 12, tipX))
    tipY = Math.max(12, Math.min(window.innerHeight - TIP_H - 12, tipY))
  }

  const bg         = isDark ? 'rgba(13,18,26,0.98)'    : 'rgba(255,255,255,0.98)'
  const border     = isDark ? 'rgba(0,200,150,0.25)'   : 'rgba(0,160,120,0.3)'
  const shadow     = isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)'
  const titleColor = isDark ? '#F1F5F9'                : '#0F172A'
  const bodyColor  = isDark ? 'rgba(255,255,255,0.55)' : '#64748B'
  const accent     = isDark ? '#00C896'                : '#059669'
  const accentBg   = isDark ? 'rgba(0,200,150,0.1)'   : 'rgba(5,150,105,0.08)'
  const accentBdr  = isDark ? 'rgba(0,200,150,0.2)'   : 'rgba(5,150,105,0.25)'
  const backdrop   = isDark ? 'rgba(6,10,16,0.72)'    : 'rgba(15,23,42,0.5)'
  const highlight  = isDark ? 'rgba(0,200,150,0.6)'   : 'rgba(5,150,105,0.6)'
  const btnBorder  = isDark ? 'rgba(255,255,255,0.08)': '#E2E8F0'
  const btnMuted   = isDark ? 'rgba(255,255,255,0.25)': '#94A3B8'
  const dotInact   = isDark ? 'rgba(255,255,255,0.12)': '#E2E8F0'

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] pointer-events-none"
        style={{ background: backdrop, backdropFilter: 'blur(2px)' }} />

      {rect && (
        <div className="fixed z-[9999] pointer-events-none rounded-xl transition-all duration-300"
          style={{
            left: rect.left - 6, top: rect.top - 6,
            width: rect.width + 12, height: rect.height + 12,
            boxShadow: `0 0 0 9999px ${backdrop}, 0 0 0 2px ${highlight}`,
            border: `1.5px solid ${highlight}`,
          }} />
      )}

      <div ref={boxRef} className="fixed z-[10000]"
        style={{
          left: rect ? tipX : '50%', top: rect ? tipY : '50%',
          transform: rect ? 'none' : 'translate(-50%,-50%)',
          width: TIP_W,
          animation: 'tourIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
        }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: 16, boxShadow: shadow }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:9999, fontFamily:'DM Mono, monospace',
                             background: accentBg, color: accent, border: `1px solid ${accentBdr}` }}>
                {step + 1} / {total}
              </span>
              <h3 style={{ color: titleColor, fontWeight:600, fontSize:13, margin:0 }}>{current?.title}</h3>
            </div>
            <button onClick={onSkip} style={{ background:'none', border:'none', cursor:'pointer', color: btnMuted,
              padding:2, flexShrink:0, marginTop:2, display:'flex', alignItems:'center' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <p style={{ color: bodyColor, fontSize:12, lineHeight:1.6, marginBottom:14 }}>{current?.content}</p>

          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ height:6, borderRadius:9999, transition:'all 0.3s ease',
                width: i === step ? 16 : 6,
                background: i <= step ? accent : dotInact }} />
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ fontSize:12, padding:'6px 12px', borderRadius:8, cursor:'pointer',
                         color: bodyColor, background:'transparent', border:`1px solid ${btnBorder}` }}>
                ← Back
              </button>
            )}
            <button onClick={() => { isLast ? onFinish() : setStep(s => s + 1) }}
              style={{ flex:1, fontSize:12, padding:'6px 12px', borderRadius:8, cursor:'pointer',
                       fontWeight:500, background: accentBg, color: accent, border:`1px solid ${accentBdr}` }}>
              {isLast ? '✓ Got it!' : 'Next →'}
            </button>
            <button onClick={onSkip}
              style={{ fontSize:12, padding:'6px 12px', borderRadius:8, cursor:'pointer',
                       color: btnMuted, background:'transparent', border:'none' }}>
              Skip
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tourIn {
          from { opacity:0; transform:scale(0.95) translateY(4px); }
          to   { opacity:1; transform:scale(1)    translateY(0);   }
        }
      `}</style>
    </>,
    document.body
  )
}