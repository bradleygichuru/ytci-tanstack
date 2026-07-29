import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '#/lib/auth-client'
import { getOwnProfile, upsertOwnProfile } from '#/lib/profile.functions'
import { User, Lock, Envelope, SignOut } from '@phosphor-icons/react'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

interface ProfileInput {
  displayName: string
  ageRange: string
  county: string
  languages: string
  preferences: string
}

const emptyProfile: ProfileInput = {
  displayName: '',
  ageRange: '',
  county: '',
  languages: '',
  preferences: '',
}

function SettingsPage() {
  const { data: session, refetch: refetchSession } = authClient.useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [profile, setProfile] = useState<ProfileInput>(emptyProfile)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)

  useEffect(() => {
    getOwnProfile()
      .then((p) => {
        if (p) {
          setDisplayName((p.displayName as string) ?? '')
          setProfile({
            displayName: (p.displayName as string) ?? '',
            ageRange: (p.ageRange as string) ?? '',
            county: (p.county as string) ?? '',
            languages: (p.languages as string) ?? '',
            preferences: (p.preferences as string) ?? '',
          })
        } else {
          upsertOwnProfile({ data: {} }).catch((err: Error) => {
            setError(err.message || 'Failed to initialize profile')
          })
        }
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [])

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    )
  }

  const user = session.user
  const effectiveDisplayName = displayName || user.name || 'No name'

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await upsertOwnProfile({
        data: {
          displayName: profile.displayName,
          ageRange: profile.ageRange,
          county: profile.county,
          languages: profile.languages,
          preferences: profile.preferences,
        },
      })
      setDisplayName(profile.displayName)
      if (profile.displayName !== (user.name ?? '')) {
        await authClient.updateUser({ name: profile.displayName })
        await refetchSession()
      }
      setSuccess('Profile updated')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      const { error: err } = await authClient.changePassword({ currentPassword, newPassword })
      if (err) {
        setError(err.message ?? 'Failed to change password')
      } else {
        setSuccess('Password changed')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setChangingPassword(false)
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setChangingEmail(true)
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const { error: err } = await authClient.changeEmail({ newEmail, callbackURL: `${baseUrl}/settings` })
      if (err) {
        setError(err.message ?? 'Failed to update email')
      } else {
        setSuccess('Verification email sent. Check your inbox.')
        setNewEmail('')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setChangingEmail(false)
  }

  async function handleSignOut() {
    try {
      await authClient.signOut()
    } catch { /* ignore, redirect anyway */ }
    await router.navigate({ to: '/login' })
  }

  const inputClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
  const labelClass = 'text-sm font-semibold text-foreground'
  const sectionClass = 'rounded-lg border border-border bg-card p-6'
  const sectionTitleClass = 'font-sans text-lg font-bold text-foreground mb-4'
  const btnClass =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and profile.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-500/50 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="space-y-6">
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>
            <span className="inline-flex items-center gap-2">
              <User className="h-5 w-5" weight="duotone" />
              Profile
            </span>
          </h2>
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <span className="text-lg font-bold text-muted-foreground">
                  {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <div>
              <p className="text-base font-bold text-foreground">
                {effectiveDisplayName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        {!loading && (
          <form onSubmit={handleProfileSubmit} className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className="inline-flex items-center gap-2">
                <User className="h-5 w-5" weight="duotone" />
                Profile Details
              </span>
            </h2>
            <div className="space-y-4">
              <InputField label="Display Name" value={profile.displayName} placeholder="Your display name" onChange={(v) => setProfile({ ...profile, displayName: v })} inputClass={inputClass} labelClass={labelClass} />
              <InputField label="Age Range" value={profile.ageRange} placeholder="e.g. 25-34" onChange={(v) => setProfile({ ...profile, ageRange: v })} inputClass={inputClass} labelClass={labelClass} />
              <InputField label="County" value={profile.county} placeholder="e.g. Nairobi" onChange={(v) => setProfile({ ...profile, county: v })} inputClass={inputClass} labelClass={labelClass} />
              <InputField label="Languages" value={profile.languages} placeholder="e.g. English, Swahili" onChange={(v) => setProfile({ ...profile, languages: v })} inputClass={inputClass} labelClass={labelClass} />
              <InputField label="Preferences" value={profile.preferences} placeholder="e.g. eco-tourism, wildlife" onChange={(v) => setProfile({ ...profile, preferences: v })} inputClass={inputClass} labelClass={labelClass} />
              <button
                type="submit"
                disabled={saving}
                className={`${btnClass} bg-primary text-primary-foreground hover:bg-primary/90`}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        <form onSubmit={handlePasswordChange} className={sectionClass}>
          <h2 className={sectionTitleClass}>
            <span className="inline-flex items-center gap-2">
              <Lock className="h-5 w-5" weight="duotone" />
              Change Password
            </span>
          </h2>
          <div className="space-y-4">
            <InputField label="Current Password" value={currentPassword} type="password" required onChange={(v) => setCurrentPassword(v)} inputClass={inputClass} labelClass={labelClass} />
            <InputField label="New Password" value={newPassword} type="password" required onChange={(v) => setNewPassword(v)} inputClass={inputClass} labelClass={labelClass} />
            <InputField label="Confirm New Password" value={confirmPassword} type="password" required onChange={(v) => setConfirmPassword(v)} inputClass={inputClass} labelClass={labelClass} />
            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className={`${btnClass} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>

        <form onSubmit={handleEmailChange} className={sectionClass}>
          <h2 className={sectionTitleClass}>
            <span className="inline-flex items-center gap-2">
              <Envelope className="h-5 w-5" weight="duotone" />
              Change Email
            </span>
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current email: <span className="font-semibold text-foreground">{user.email}</span>
            </p>
            <InputField label="New Email" value={newEmail} type="email" required onChange={(v) => setNewEmail(v)} inputClass={inputClass} labelClass={labelClass} />
            <button
              type="submit"
              disabled={changingEmail || !newEmail}
              className={`${btnClass} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              {changingEmail ? 'Sending...' : 'Send Verification'}
            </button>
          </div>
        </form>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>
            <span className="inline-flex items-center gap-2">
              <SignOut className="h-5 w-5" weight="duotone" />
              Sign Out
            </span>
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign out of your account on this device.
          </p>
          <button
            onClick={handleSignOut}
            className={`${btnClass} bg-destructive text-destructive-foreground hover:bg-destructive/90`}
          >
            <SignOut className="h-4 w-4" weight="duotone" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  placeholder,
  type,
  required,
  onChange,
  inputClass,
  labelClass,
}: {
  label: string
  value: string
  placeholder?: string
  type?: string
  required?: boolean
  onChange: (value: string) => void
  inputClass: string
  labelClass: string
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} mt-1`}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

export default SettingsPage
