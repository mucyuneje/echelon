'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/store/slices/authSlice'
import { RootState } from '@/store'
import clsx from 'clsx'

export default function Sidebar() {
  const path = usePathname()
  const dispatch = useDispatch()
  const router = useRouter()
  const user = useSelector((s: RootState) => s.auth.user)

  const handleLogout = () => { dispatch(logout()); router.push('/auth') }

  const NAV = [
    { href: '/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/jobs', label: 'Jobs', icon: '⬡' },
    { href: '/candidates', label: 'Candidates', icon: '◈' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 lg:w-56 flex flex-col border-r border-white/6 bg-slate-950/90 backdrop-blur-xl z-40">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/6">
        <div className="w-8 h-8 bg-jade/10 border border-jade/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z" stroke="#00C896" strokeWidth="1.2" fill="none"/>
            <circle cx="8" cy="8" r="2.5" fill="#00C896"/>
          </svg>
        </div>
        <span className="hidden lg:block text-white font-semibold text-sm">Echel<span style={{color:'#00C896'}}>on</span></span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link key={href} href={href} className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
              active ? 'bg-jade/10 text-jade' : 'text-white/40 hover:text-white hover:bg-white/5'
            )}>
              <span className="text-base w-4 text-center">{icon}</span>
              <span className="hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/6 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-jade/20 flex-shrink-0 flex items-center justify-center text-jade text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-white/30 text-xs capitalize">{user?.role || 'recruiter'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all text-xs">
          <span>↳</span><span className="hidden lg:block">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
