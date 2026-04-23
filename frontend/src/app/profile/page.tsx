'use client'
import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { authAPI } from '@/lib/api'
import { setUser } from '@/store/slices/authSlice'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ProfilePage() {
  const dispatch = useDispatch()
  const user = useSelector((s: RootState) => s.auth.user)
  const token = useSelector((s: RootState) => s.auth.token)

  const [nameForm,  setNameForm]  = useState({ name: user?.name || '' })
  const [pwForm,    setPwForm]    = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingName, setSavingName] = useState(false)
  const [savingPw,   setSavingPw]   = useState(false)

  const initials = (user?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameForm.name.trim()) { toast.error('Name is required'); return }
    setSavingName(true)
    try {
      const res = await authAPI.updateProfile({ name: nameForm.name })
      dispatch(setUser(res.data.data))
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally { setSavingName(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwForm.currentPassword) { toast.error('Enter current password'); return }
    if (pwForm.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setSavingPw(true)
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally { setSavingPw(false) }
  }

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 680, margin: '0 auto' }}>

      {/* Back */}
      <Link href="/dashboard" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 24,
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Back
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        My Profile
      </h1>

      {/* Identity card */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
          background: 'var(--umu-blue-bg)', border: '2px solid var(--umu-blue-faint)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: 'var(--umu-blue)',
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {user?.name}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{user?.email}</p>
          <span style={{
            display: 'inline-block', fontSize: 10, padding: '2px 10px', borderRadius: 20,
            background: 'var(--umu-blue-bg)', color: 'var(--umu-blue)',
            border: '1px solid var(--umu-blue-faint)', textTransform: 'capitalize',
          }}>{user?.role}</span>
        </div>

        {/* Token info */}
        <div style={{
          padding: '10px 14px', borderRadius: 10, textAlign: 'right',
          background: 'var(--bg)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Session</p>
          <p style={{ fontSize: 11, color: '#00C896', fontFamily: 'monospace', fontWeight: 600 }}>
            ● Active
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
            JWT · 7 days
          </p>
        </div>
      </div>

      {/* Update name */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="section-label" style={{ marginBottom: 16 }}>Account Details</p>
        <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={nameForm.name}
              onChange={e => setNameForm({ name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              className="input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Email cannot be changed
            </p>
          </div>
          <div>
            <label className="label">Role</label>
            <input
              className="input"
              value={user?.role || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }}
            />
          </div>
          <div>
            <button type="submit" disabled={savingName} className="btn-primary" style={{ padding: '9px 20px' }}>
              {savingName ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="section-label" style={{ marginBottom: 16 }}>Change Password</p>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password"
            />
          </div>
          {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
            <p style={{ fontSize: 11, color: '#EF4444', marginTop: -8 }}>Passwords do not match</p>
          )}
          <div>
            <button
              type="submit"
              disabled={savingPw || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirm}
              className="btn-primary"
              style={{ padding: '9px 20px' }}
            >
              {savingPw ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 16 }}>Account Info</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'User ID',   value: user?._id },
            { label: 'Role',      value: user?.role },
            { label: 'Auth',      value: 'JWT Bearer Token · 7 day expiry' },
            { label: 'API Base',  value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{
                fontSize: 11, color: 'var(--text-secondary)',
                fontFamily: 'monospace', maxWidth: 300,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}