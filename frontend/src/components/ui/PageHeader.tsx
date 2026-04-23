'use client'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'

interface Crumb { label: string; href?: string }

interface Props {
  title: string
  subtitle?: string
  breadcrumbs?: Crumb[]
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs, action }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const textPri = isDark ? '#F1F5F9' : '#0F172A'
  const textSec = isDark ? '#94A3B8' : '#475569'
  const textMut = isDark ? '#475569' : '#94A3B8'
  const border  = isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'

  return (
    <div style={{ borderBottom:`1px solid ${border}`, paddingBottom:20, marginBottom:28 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 mb-3" style={{ fontSize:12, color:textMut }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {b.href
                ? <Link href={b.href} style={{ color:'#2563EB', fontWeight:500 }}>{b.label}</Link>
                : <span style={{ color:textMut }}>{b.label}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:textPri, letterSpacing:'-0.02em' }}>{title}</h1>
          {subtitle && <p style={{ fontSize:13, color:textSec, marginTop:4 }}>{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
