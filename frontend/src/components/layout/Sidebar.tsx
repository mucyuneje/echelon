'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/store/slices/authSlice'
import { RootState } from '@/store'
import { useTheme } from '@/components/ThemeProvider'
import { createContext, useContext, useState, useEffect } from 'react'

export const SidebarContext = createContext<{
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}>({ collapsed: false, setCollapsed: () => {}, mobileOpen: false, setMobileOpen: () => {} })

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])
  const handleSetCollapsed = (v: boolean) => {
    setCollapsed(v)
    localStorage.setItem('sidebar-collapsed', String(v))
  }
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}
export function useSidebar() { return useContext(SidebarContext) }

const NAV = [
  { href: '/dashboard', label: 'Dashboard', id: 'nav-dashboard', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".8" /><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".8" /><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".4" /><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity=".4" /></svg> },
  { href: '/jobs', label: 'Jobs', id: 'nav-jobs', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
  { href: '/candidates', label: 'Candidates', id: 'nav-candidates', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3" /><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
  { href: '/screening', label: 'Screening', id: 'nav-screening', badge: 'AI', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> },
]

function NavLinks({ collapsed }: { collapsed: boolean }) {
  const path = usePathname()
  const isDark = useTheme().theme === 'dark'
  return (
    <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
      {NAV.map(({ href, icon, label, id, badge }) => {
        const active = path === href || (href !== '/dashboard' && path.startsWith(href))
        return (
          <Link key={href} href={href} id={id} title={collapsed ? label : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 12px',
              borderRadius: 10, textDecoration: 'none',
              background: active ? (isDark ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.2)') : 'transparent',
              color: active ? '#FFFFFF' : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)',
              transition: 'background 0.15s',
            }}>
            <span style={{ flexShrink: 0 }}>{icon}</span>
            {!collapsed && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{label}</span>
                {badge && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 9999, fontWeight: 600, fontFamily: 'DM Mono, monospace', background: 'rgba(0,200,150,0.2)', color: '#00C896', border: '1px solid rgba(0,200,150,0.3)' }}>{badge}</span>}
                {active && <div style={{ width: 3, height: 16, borderRadius: 4, background: 'white', opacity: 0.8, marginLeft: 4 }} />}
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

// ─── Sign-out overlay ─────────────────────────────────────────────────────────
function SignOutOverlay() {
  return (
    <>
      {/* Top progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        height: 3, background: 'rgba(37,99,235,0.15)',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #2563EB, #3B82F6, #60A5FA)',
          borderRadius: '0 2px 2px 0',
          animation: 'signOutBar 1.1s cubic-bezier(0.4,0,0.2,1) forwards',
        }}/>
      </div>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'signOutBg 1.1s ease forwards',
      }}>
        {/* Center card */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          padding: '28px 36px', borderRadius: 16,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(12px)',
          animation: 'signOutCard 0.3s ease forwards',
        }}>
          {/* Spinning ring with lock icon */}
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <svg style={{ animation: 'spin 0.9s linear infinite' }}
              width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="18" stroke="rgba(37,99,235,0.12)" strokeWidth="3"/>
              <path d="M22 4 A18 18 0 0 1 40 22" stroke="#2563EB" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#2563EB" strokeWidth="1.3"/>
                <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
              Signing out…
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              See you next time
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes signOutBar {
          0%   { width: 0% }
          30%  { width: 45% }
          65%  { width: 72% }
          85%  { width: 90% }
          100% { width: 100% }
        }
        @keyframes signOutBg {
          0%   { background: rgba(15,23,42,0);    backdrop-filter: blur(0px)  }
          20%  { background: rgba(15,23,42,0.25); backdrop-filter: blur(4px)  }
          100% { background: rgba(15,23,42,0.45); backdrop-filter: blur(8px)  }
        }
        @keyframes signOutCard {
          0%   { opacity: 0; transform: scale(0.88) translateY(8px) }
          100% { opacity: 1; transform: scale(1)    translateY(0)    }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

export default function Sidebar() {
  const dispatch = useDispatch()
  const router = useRouter()
  const path = usePathname()
  const user = useSelector((s: RootState) => s.auth.user)
  const { theme, toggle } = useTheme()
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const isDark = theme === 'dark'
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [path])

  const handleSignOut = () => {
    if (signingOut) return
    setSigningOut(true)
    setTimeout(() => {
      dispatch(logout())
      router.push('/auth')
    }, 1100)
  }

  const bg = isDark ? '#0D1219' : '#2563EB'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)'
  const w = collapsed ? 64 : 240

  const BottomActions = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const c = forceExpanded ? false : collapsed
    return (
      <div style={{ borderTop: `1px solid ${border}`, padding: 8 }}>
        <button onClick={toggle} title={c ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: c ? 0 : 10, justifyContent: c ? 'center' : 'flex-start', padding: c ? '8px 0' : '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)' }}>
          {isDark
            ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7.5 1v1M7.5 13v1M1 7.5h1M13 7.5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5A6 6 0 1013.5 7.5c0-.3-.3-.5-.5-.2A4.5 4.5 0 017.5 1.5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5z" fill="currentColor" /></svg>
          }
          {!c && <span style={{ fontSize: 12, fontWeight: 500 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <Link href="/profile" title={c ? (user?.name || 'Profile') : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: c ? 0 : 10, justifyContent: c ? 'center' : 'flex-start', padding: c ? '8px 0' : '8px 12px', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!c && <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user?.role || 'recruiter'}</span>
          </div>}
          {!c && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M4 2l3 3-3 3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round" /></svg>}
        </Link>

        {/* Sign-out button — now calls handleSignOut */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          title={c ? 'Sign out' : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: c ? 0 : 10,
            justifyContent: c ? 'center' : 'flex-start',
            padding: c ? '8px 0' : '8px 12px',
            borderRadius: 10, border: 'none', cursor: signingOut ? 'not-allowed' : 'pointer',
            background: signingOut ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)',
            fontSize: 12, fontWeight: 500,
            transition: 'background 0.15s, color 0.15s',
          }}>
          {signingOut ? (
            <>
              <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
                width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="12 8"/>
              </svg>
              {!c && <span>Signing out…</span>}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 1H2a1 1 0 00-1 1v9a1 1 0 001 1h3M9 9.5L12 6.5M12 6.5L9 3.5M12 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {!c && <span>Sign out</span>}
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Sign-out overlay — renders on top of everything */}
      {signingOut && <SignOutOverlay />}

      {/* Desktop */}
      <aside id="sidebar" className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-40"
        style={{ width: w, background: bg, borderRight: isDark ? `1px solid ${border}` : 'none', transition: 'width 0.25s cubic-bezier(.4,0,.2,1)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '14px 0' : '14px 16px', borderBottom: `1px solid ${border}`, minHeight: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 6C12.268 6 6 12.268 6 20s6.268 14 14 14 14-6.268 14-14S27.732 6 20 6z" fill="rgba(255,255,255,0.15)" /><path fillRule="evenodd" clipRule="evenodd" d="M20 9.5C14.201 9.5 9.5 14.201 9.5 20S14.201 30.5 20 30.5 30.5 25.799 30.5 20 25.799 9.5 20 9.5zM16 18.5c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4z" fill="white" fillOpacity="0.9" /><path d="M14 14c-1.5 1.5-2.5 3.5-2.5 6s1 4.5 2.5 6M26 14c1.5 1.5 2.5 3.5 2.5 6s-1 4.5-2.5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" /></svg>
            </div>
            {!collapsed && <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em' }}>competence</span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 19 }}>.</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>BY UMURAVA</p>
            </div>}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 6px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <button onClick={() => setCollapsed(false)} title="Expand"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 6px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
        <NavLinks collapsed={collapsed} />
        <BottomActions />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
        style={{ background: isDark ? '#0D1219' : '#2563EB', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setMobileOpen(false)} style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 240, height: '100%', display: 'flex', flexDirection: 'column', background: bg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg viewBox="0 0 40 40" width="28" height="28" fill="none"><path d="M20 6C12.268 6 6 12.268 6 20s6.268 14 14 14 14-6.268 14-14S27.732 6 20 6z" fill="rgba(255,255,255,0.15)" /><path fillRule="evenodd" clipRule="evenodd" d="M20 9.5C14.201 9.5 9.5 14.201 9.5 20S14.201 30.5 20 30.5 30.5 25.799 30.5 20 25.799 9.5 20 9.5zM16 18.5c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4z" fill="white" fillOpacity="0.9" /></svg>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>competence.</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <NavLinks collapsed={false} />
            <BottomActions forceExpanded />
          </div>
        </div>
      )}
    </>
  )
}