import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserCircle, Lock, Camera, CheckCircle, Warning, ClockCountdown,
  PencilSimple, ShieldCheck, IdentificationCard, Envelope,
  Buildings, Briefcase, Check, X, ArrowRight
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth.store'
import { profileApi, type NameChangeRequest } from '@/api/profile.api'
import { authApi } from '@/api/auth.api'

const C = {
  navy: '#1a2540',
  navyDark: '#0f172a',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  border: '#e2e8f0',
  text1: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  red: '#dc2626',
  redLight: '#fef2f2',
  amber: '#d97706',
  amberLight: '#fffbeb',
  green: '#059669',
  greenLight: '#ecfdf5',
  cardBg: '#ffffff',
  pageBg: '#f8fafc',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  project_manager: 'Project Manager',
  liaison_officer: 'Liaison Officer',
  hr_officer: 'HR Officer',
  engineer: 'Site Engineer',
  accounts: 'Accounts Officer',
  qa_engineer: 'QA Engineer',
  supervisor: 'Site Supervisor',
  accountant: 'Accountant',
  field_staff: 'Field Staff',
  viewer: 'Viewer',
}

export default function MyProfilePage() {
  const qc = useQueryClient()
  const { user, hydrateUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatar, setAvatar] = useState<string | null>(() =>
    localStorage.getItem('avatar_' + (user?.id ?? ''))
  )

  const isManager =
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    user?.role === 'project_manager'

  // Fetch profile details
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: () => profileApi.getProfile(),
    refetchInterval: 15000,
  })

  // Fetch pending name change requests (for Admin / PM)
  const { data: allRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['name-change-requests'],
    queryFn: () => profileApi.getNameChangeRequests(),
    enabled: isManager,
    refetchInterval: 20000,
  })

  // Name correction form state
  const [isEditingName, setIsEditingName] = useState(false)
  const [correctedName, setCorrectedName] = useState('')
  const [nameReason, setNameReason] = useState('')
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')

  useEffect(() => {
    if (user?.name && !correctedName) {
      setCorrectedName(user.name)
    }
  }, [user?.name])

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  // Avatar upload
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      localStorage.setItem('avatar_' + (user?.id ?? ''), b64)
      setAvatar(b64)
    }
    reader.readAsDataURL(file)
  }

  // Name change submission mutation
  const submitNameMutation = useMutation({
    mutationFn: async () => {
      setNameError('')
      setNameSuccess('')
      const trimmed = correctedName.trim()
      if (!trimmed || trimmed.length < 2) {
        throw new Error('Please enter a valid full name (at least 2 characters).')
      }
      if (trimmed.toLowerCase() === user?.name?.trim().toLowerCase()) {
        throw new Error('The entered name is identical to your current spelling.')
      }
      return profileApi.submitNameChangeRequest(trimmed, nameReason)
    },
    onSuccess: data => {
      if (data.autoApproved) {
        setNameSuccess('Name updated successfully!')
        if (user) hydrateUser({ ...user, name: correctedName.trim() })
      } else {
        setNameSuccess(
          'Your name correction request has been submitted. The Project Manager and Admin have been notified for acceptance.'
        )
      }
      setIsEditingName(false)
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      qc.invalidateQueries({ queryKey: ['name-change-requests'] })
    },
    onError: (err: any) => {
      setNameError(err?.response?.data?.message || err?.message || 'Failed to submit name request.')
    },
  })

  // Review request mutation (Approve/Reject by Admin/PM)
  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: 'approve' | 'reject'; note?: string }) => {
      return profileApi.reviewNameChangeRequest(id, action, note)
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      qc.invalidateQueries({ queryKey: ['name-change-requests'] })
      if (vars.action === 'approve') {
        // If the approver just approved their own request, update user state
        if (data?.request?.userId === user?.id && user) {
          hydrateUser({ ...user, name: data.request.requestedName })
        }
      }
      refetchRequests()
    },
  })

  // Password change submission
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!currentPassword) {
      setPwdError('Please enter your current password.')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.')
      return
    }

    setPwdLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setPwdSuccess('Password updated successfully! Please use it on your next login.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPwdError(
        err?.response?.data?.message ||
        'Could not update password. Please verify your current password.'
      )
    } finally {
      setPwdLoading(false)
    }
  }

  const initials =
    user?.name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  const activeReq = profileData?.activeRequest
  const emp = profileData?.employee
  const pendingRequests = (allRequests || []).filter(r => r.status === 'pending')

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px 64px' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>
          My Profile
        </h1>
        <p style={{ fontSize: 13, color: C.text2, margin: '4px 0 0' }}>
          Manage your personal identity, official name spelling, and account security.
        </p>
      </div>

      {/* ── Profile Hero Header Card ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a8a 100%)`,
          borderRadius: 16,
          padding: '24px 28px',
          color: '#fff',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.15)',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 260 }}>
          {/* Avatar with Camera upload */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: C.blue,
                border: '3px solid rgba(255,255,255,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
              title="Click to upload profile photo"
            >
              {avatar ? (
                <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#fff',
                border: 'none',
                color: C.navy,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
              aria-label="Upload photo"
            >
              <Camera size={14} weight="bold" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                {user?.name || 'Staff Member'}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  backdropFilter: 'blur(4px)',
                  letterSpacing: '0.02em',
                }}
              >
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
            <p style={{ fontSize: 13, opacity: 0.85, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Envelope size={14} />
              {user?.email}
            </p>
            {emp?.empCode && (
              <p style={{ fontSize: 11, opacity: 0.75, margin: '4px 0 0', fontWeight: 600 }}>
                Employee Code: {emp.empCode}
              </p>
            )}
          </div>
        </div>

        {/* Project & Authority Badge */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '12px 18px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: 2 }}>Assigned Project</div>
          <div style={{ fontWeight: 600 }}>Dal Lake Sewerage Scheme (STP)</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Employer: J&amp;K UEED • Nishat Srinagar</div>
        </div>
      </div>

      {/* ── Pending Requests Review Banner for Admin/PM ── */}
      {isManager && pendingRequests.length > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.amber,
              }}
            >
              <Warning size={18} weight="fill" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#92400e', margin: 0 }}>
                Pending Name Correction Requests ({pendingRequests.length})
              </h3>
              <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>
                As an Admin / Project Manager, you can verify and approve employee name spelling corrections.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingRequests.map(req => (
              <div
                key={req.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fef3c7',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div style={{ minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>
                      {req.currentName}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: '#f1f5f9',
                        color: C.text2,
                      }}
                    >
                      {ROLE_LABELS[req.userRole] ?? req.userRole}
                    </span>
                    <span style={{ fontSize: 11, color: C.text3 }}>({req.userEmail})</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: C.text2 }}>Correction to:</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: C.green,
                        background: '#ecfdf5',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      {req.requestedName}
                    </span>
                    {req.reason && (
                      <span style={{ fontSize: 11, color: C.text3, fontStyle: 'italic' }}>
                        &mdash; &ldquo;{req.reason}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: C.green,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={14} weight="bold" />
                    Accept &amp; Update
                  </button>

                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      const note = window.prompt('Optional reason for rejection:')
                      reviewMutation.mutate({ id: req.id, action: 'reject', note: note ?? undefined })
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#fff',
                      color: C.red,
                      border: `1.5px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} weight="bold" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* ── CARD 1: Name Correction & Identity ── */}
        <div
          style={{
            background: C.cardBg,
            border: `1.5px solid ${C.border}`,
            borderRadius: 14,
            padding: 22,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: C.blueLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.blue,
              }}
            >
              <IdentificationCard size={20} weight="bold" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>
                Official Name &amp; Identity
              </h3>
              <p style={{ fontSize: 12, color: C.text3, margin: '2px 0 0' }}>
                Used on official correspondence, site reports, and timesheets.
              </p>
            </div>
          </div>

          {/* Active Request Alert */}
          {activeReq && activeReq.status === 'pending' && (
            <div
              style={{
                background: C.amberLight,
                border: '1px solid #fde68a',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <ClockCountdown size={18} color={C.amber} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                  Name Change Request Pending Approval
                </div>
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 3, lineHeight: 1.4 }}>
                  You requested to correct your name from <strong>{activeReq.currentName}</strong> to{' '}
                  <strong style={{ color: C.navyDark }}>{activeReq.requestedName}</strong>.
                </div>
                <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                  Notification sent to Project Manager &amp; Admin for acceptance.
                </div>
              </div>
            </div>
          )}

          {activeReq && activeReq.status === 'approved' && !isEditingName && (
            <div
              style={{
                background: C.greenLight,
                border: '1px solid #a7f3d0',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle size={18} color={C.green} weight="fill" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#065f46' }}>
                Name spelling confirmed and updated to <strong>{activeReq.requestedName}</strong>.
              </div>
            </div>
          )}

          {nameSuccess && (
            <div
              style={{
                background: C.greenLight,
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {nameSuccess}
            </div>
          )}

          {nameError && (
            <div
              style={{
                background: C.redLight,
                border: '1px solid #fecaca',
                color: C.red,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {nameError}
            </div>
          )}

          {/* Current Name Display & Edit Toggle */}
          {!isEditingName ? (
            <div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase' }}>
                  Current Registered Name
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text1, marginTop: 4 }}>
                  {user?.name}
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCorrectedName(user?.name || '')
                    setNameReason('')
                    setIsEditingName(true)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#fff',
                    color: C.blue,
                    border: `1.5px solid ${C.blue}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <PencilSimple size={14} weight="bold" />
                  Correct Name Spelling
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
                  Corrected Full Name <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  value={correctedName}
                  onChange={e => setCorrectedName(e.target.value)}
                  placeholder="Enter corrected name spelling..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 13,
                    color: C.text1,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 4 }}>
                  Reason for Change (Optional)
                </label>
                <input
                  type="text"
                  value={nameReason}
                  onChange={e => setNameReason(e.target.value)}
                  placeholder="e.g. Spelling error in last name"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 13,
                    color: C.text1,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={submitNameMutation.isPending}
                  onClick={() => setIsEditingName(false)}
                  style={{
                    background: '#fff',
                    color: C.text2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={submitNameMutation.isPending}
                  onClick={() => submitNameMutation.mutate()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: C.blue,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: submitNameMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: submitNameMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {isManager ? 'Save Name Directly' : 'Submit for Acceptance'}
                  <ArrowRight size={13} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* Official notice */}
          <div
            style={{
              marginTop: 18,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              fontSize: 11,
              color: C.text3,
              lineHeight: 1.4,
            }}
          >
            <strong>Note:</strong> Name changes are logged in the project audit log and updated across linked timesheets, site attendance, and employee directories.
          </div>
        </div>

        {/* ── CARD 2: Security & Password ── */}
        <div
          id="security"
          style={{
            background: C.cardBg,
            border: `1.5px solid ${C.border}`,
            borderRadius: 14,
            padding: 22,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.red,
              }}
            >
              <Lock size={20} weight="bold" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>
                Change Password
              </h3>
              <p style={{ fontSize: 12, color: C.text3, margin: '2px 0 0' }}>
                Ensure your account uses a secure password of 8+ characters.
              </p>
            </div>
          </div>

          {pwdSuccess && (
            <div
              style={{
                background: C.greenLight,
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {pwdSuccess}
            </div>
          )}

          {pwdError && (
            <div
              style={{
                background: C.redLight,
                border: '1px solid #fecaca',
                color: C.red,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {pwdError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${C.border}`,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={pwdLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: C.navy,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: pwdLoading ? 'not-allowed' : 'pointer',
                  opacity: pwdLoading ? 0.7 : 1,
                }}
              >
                <ShieldCheck size={14} weight="bold" />
                {pwdLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── CARD 3: Employment Record Details ── */}
      <div
        style={{
          background: C.cardBg,
          border: `1.5px solid ${C.border}`,
          borderRadius: 14,
          padding: 22,
          marginTop: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.green,
            }}
          >
            <Buildings size={20} weight="bold" />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>
              HR Employment Record
            </h3>
            <p style={{ fontSize: 12, color: C.text3, margin: '2px 0 0' }}>
              Staff roster and organizational mapping at Khilari Infrastructure Private Limited.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>DESIGNATION</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginTop: 4 }}>
              {emp?.designation || ROLE_LABELS[user?.role ?? ''] || 'Site Engineer'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>DEPARTMENT</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginTop: 4 }}>
              {emp?.department || 'Civil & Engineering'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>SYSTEM ROLE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginTop: 4 }}>
              {ROLE_LABELS[user?.role ?? ''] || user?.role}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>STATUS</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginTop: 4 }}>
              Active on Roster
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
