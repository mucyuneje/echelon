'use client'
import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import Sidebar, { SidebarProvider, useSidebar } from './Sidebar'
import AppTour, { useAppTour } from '@/components/tour/AppTour'
import type { TourStep } from '@/components/tour/AppTour'
import TopProgressBar from '@/components/ui/TopProgressBar'

const TOUR_STEPS: TourStep[] = [
  { target:'#sidebar',        title:'Welcome to Echelon',  content:'AI recruitment command centre. Navigate with the sidebar.',   placement:'right' },
  { target:'#nav-jobs',       title:'Jobs',                content:'Create jobs — AI auto-analyzes requirements.',                placement:'right' },
  { target:'#nav-candidates', title:'Candidates',          content:'Upload CVs, spreadsheets, or Umurava profiles.',              placement:'right' },
  { target:'#nav-screening',  title:'AI Screening',        content:'Run Gemini-powered screening and get ranked shortlists.',     placement:'right' },
]

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const sidebarWidth = collapsed ? 64 : 240

  return (
    <main
      style={{
        marginLeft: sidebarWidth,
        minHeight: '100vh',
        width: `calc(100% - ${sidebarWidth}px)`,
        transition: 'margin-left 0.25s cubic-bezier(.4,0,.2,1), width 0.25s cubic-bezier(.4,0,.2,1)',
        background: 'var(--bg)',
        overflowX: 'hidden',
        flex: 1, 
      }}
    >
      {children}
    </main>
  )
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, loading } = useSelector((s: RootState) => s.auth)
  const { run, finish } = useAppTour()

  useEffect(() => {
    if (!loading && !token && !localStorage.getItem('token')) router.replace('/auth')
  }, [token, loading])

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <TopProgressBar />
      </Suspense>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar />
        <MainContent>{children}</MainContent>
        <AppTour steps={TOUR_STEPS} run={run} onFinish={finish} onSkip={finish} />
      </div>
    </SidebarProvider>
  )
}