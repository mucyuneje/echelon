'use client'
import './globals.css'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider store={store}>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '10px' },
                success: { iconTheme: { primary: '#2563EB', secondary: '#FFFFFF' } },
                error:   { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
              }}
            />
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  )
}