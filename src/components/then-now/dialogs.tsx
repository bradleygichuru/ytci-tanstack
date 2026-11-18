import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Calendar, CheckCircle, Upload, Warning } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { formatDateEat, isoAtEat } from '#/lib/then-now/format'
import type { Experience } from '#/lib/then-now/types'

export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  variant = 'default',
  disabled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} disabled={disabled}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  onConfirm,
  variant = 'default',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label: string
  placeholder?: string
  confirmLabel: string
  onConfirm: (reason: string) => void
  variant?: 'default' | 'destructive'
}) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <label className="space-y-1.5 text-sm font-semibold text-foreground">
          {label}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={variant} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ScheduleDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (at: string, note: string) => void
}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10))
  const [time, setTime] = useState('09:00')
  const [note, setNote] = useState('')
  useEffect(() => { if (open) { const next = new Date(); next.setDate(next.getDate() + 1); setDate(next.toISOString().slice(0, 10)); setTime('09:00'); setNote('') } }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule publish</DialogTitle>
          <DialogDescription>Africa/Nairobi (EAT). Approval and publish stay separate.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-foreground">
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-foreground">
            Time (EAT)
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal" />
          </label>
        </div>
        <label className="space-y-1.5 text-sm font-semibold text-foreground">
          Release note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-normal" placeholder="Optional note for the audit log" />
        </label>
        <p className="rounded-md border border-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2 text-xs text-[var(--amber-deep)]">
          <Calendar className="mr-1 inline h-3.5 w-3.5" weight="fill" />
          The scheduler publishes this revision at the chosen date and time. Rights expiry is checked again before it goes live.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!date || !time} onClick={() => onConfirm(isoAtEat(date, time), note)}>Schedule publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ClientApprovalDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (approval: { name: string; role: string; at: string }) => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('Client approver')
  useEffect(() => { if (open) { setName(''); setRole('Client approver') } }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record client approval</DialogTitle>
          <DialogDescription>The client approver does not get an account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-foreground">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Njeri K." className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-foreground">
            Role
            <input value={role} onChange={(event) => setRole(event.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">The decision is recorded by an administrator and appears in the audit timeline.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => onConfirm({ name: name.trim(), role: role.trim() || 'Client approver', at: new Date().toISOString() })}>Record approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExternalReviewerDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reviewer: { name: string; org: string; decision: 'approved' | 'changes' }) => void
}) {
  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [decision, setDecision] = useState<'approved' | 'changes'>('approved')
  useEffect(() => { if (open) { setName(''); setOrg(''); setDecision('approved') } }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record external reviewer</DialogTitle>
          <DialogDescription>Used for sensitive or restricted revisions. No account is created.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-foreground">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Wanjiku M." className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-foreground">
            Organisation
            <input value={org} onChange={(event) => setOrg(event.target.value)} placeholder="Community / cultural reviewer" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal" />
          </label>
        </div>
        <label className="space-y-1.5 text-sm font-semibold text-foreground">
          Decision
          <select value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'changes')} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm font-normal">
            <option value="approved">Approved</option>
            <option value="changes">Request changes</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">The external reviewer’s decision is recorded by an administrator. One request-changes blocks the revision.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => onConfirm({ name: name.trim(), org: org.trim() || 'External reviewer', decision })}>Record reviewer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VideoUploadDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (file: { name: string; size: number }) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  useEffect(() => { if (open) { setFile(null); setProgress(0); setError('') } }, [open])

  const pick = (selected: File | null) => {
    setFile(selected)
    setError('')
    setProgress(0)
    if (!selected) return
    if (!selected.type.includes('mp4')) {
      setError('Choose an MP4 file. Validation uses magic bytes in production.')
      return
    }
    if (selected.size > 2_000_000_000) {
      setError('The file is over the 2 GB fixture limit.')
      return
    }
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          if (timer.current) clearInterval(timer.current)
          return 100
        }
        return Math.min(100, value + 25)
      })
    }, 180)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace site video</DialogTitle>
          <DialogDescription>Pre-compressed 4K current-scene master. No transcoding in v1.</DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-[var(--surface-2)] px-4 py-8 text-center">
          <Upload className="h-6 w-6 text-muted-foreground" weight="duotone" />
          <span className="text-sm font-semibold text-foreground">{file ? file.name : 'Choose an MP4 file'}</span>
          <span className="text-xs text-muted-foreground">Fixture mode: metadata only; no bytes leave the browser.</span>
          <input type="file" accept="video/mp4" className="sr-only" onChange={(event) => pick(event.target.files?.[0] ?? null)} />
        </label>
        {progress > 0 && progress < 100 && (
          <div className="space-y-1" role="status">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Uploading</span><span>{progress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-[var(--amber)] transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        {progress >= 100 && file && (
          <div className="flex items-center gap-2 rounded-md border border-[var(--success-leaf)]/30 bg-[var(--leaf-bg)] px-3 py-2 text-sm text-[var(--success-leaf)]">
            <CheckCircle className="h-4 w-4" weight="fill" /> Ready to attach. The 1080p, 720p, and 540p files are marked ready in this fixture.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:text-red-300">
            <Warning className="h-4 w-4" weight="fill" /> {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!file || progress < 100}
            onClick={() => {
              if (!file) return
              onComplete({ name: file.name, size: file.size })
              onOpenChange(false)
            }}
          >
            Attach video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RevisionsDialog({
  open,
  onOpenChange,
  exp,
  onPreview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exp: Experience
  onPreview: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revision history</DialogTitle>
          <DialogDescription>{exp.title} · contentVersion {exp.draftRevision}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">Live v{exp.liveRevision || 0}</p>
              {exp.liveRevision ? <StatusBadge status="published" label="Live" /> : <StatusBadge status="unpublished" label="No live revision" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{exp.liveRevision ? 'The version the public app reads.' : 'This experience has not been published.'}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={onPreview}>View live preview</Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">Draft v{exp.draftRevision}</p>
              <StatusBadge status={exp.draftStatus} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {exp.draftStatus === 'in_review' ? 'Frozen in review.' : exp.draftStatus === 'approved' ? 'Approved; ready to publish.' : 'Editable.'}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Last saved {formatDateEat(exp.lastSavedAt)}</p>
          </div>
        </div>
        <p className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs text-muted-foreground">
          Published experiences use staged revisions: the live version stays public while a replacement is drafted, reviewed, and promoted. One open revision at a time.
        </p>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
