import { useState, useRef, useCallback } from 'react'
import { useApi } from '#/lib/api/use-api'
import { CloudArrowUp, CheckCircle, XCircle } from '@phosphor-icons/react'

type UploadState = 'idle' | 'validating' | 'presigning' | 'uploading' | 'completing' | 'done' | 'error'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'audio/mpeg', 'application/pdf'] as const
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MAX_AUDIO_SIZE = 100 * 1024 * 1024

function isAudioType(type: string): boolean {
  return type === 'audio/mp4' || type === 'audio/x-m4a' || type === 'audio/mpeg'
}

function normalizeType(type: string, fileName: string): string {
  if (type === 'audio/x-m4a') return 'audio/mp4'
  if (type) return type
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.m4a')) return 'audio/mp4'
  if (lower.endsWith('.mp3')) return 'audio/mpeg'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return type
}

function maxSizeFor(type: string): number {
  if (type === 'video/mp4') return MAX_VIDEO_SIZE
  if (isAudioType(type)) return MAX_AUDIO_SIZE
  return MAX_IMAGE_SIZE
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = audio.duration
      URL.revokeObjectURL(url)
      if (Number.isFinite(duration) && duration > 0) resolve(duration)
      else reject(new Error('Could not read audio duration'))
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read audio duration'))
    }
    audio.src = url
  })
}

export interface MediaUploadResult {
  id: string
  objectKey: string
  status: string
  url?: string | null
  thumbnailUrl?: string | null
  durationSeconds?: number
  contentType?: string
  sizeBytes?: number
}

interface MediaUploadProps {
  label?: string
  allowedTypes?: readonly string[]
  metadata?: { caption?: string; altText?: string; credit?: string; type?: 'image' | 'video' | 'audio' | 'pdf'; entityType?: string; entityId?: string }
  entityType?: string
  entityId?: string
  onComplete: (result: MediaUploadResult) => void
  onError?: (error: string) => void
  autoUpload?: boolean
  compact?: boolean
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function MediaUpload({ label = 'Upload File', allowedTypes = ALLOWED_TYPES, metadata, entityType, entityId, onComplete, onError, autoUpload = true, compact = false }: MediaUploadProps) {
  const api = useApi()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<MediaUploadResult | null>(null)

  const reset = useCallback(() => {
    setState('idle')
    setFile(null)
    setErrorMsg(null)
    setProgress(0)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const startUpload = useCallback(async (selectedFile: File) => {
    setState('validating')
    setErrorMsg(null)

    const effectiveType = normalizeType(selectedFile.type, selectedFile.name)
    if (!allowedTypes.includes(effectiveType) && !(effectiveType === 'audio/mp4' && allowedTypes.includes('audio/x-m4a'))) {
      setState('error')
      setErrorMsg(`File type "${selectedFile.type}" not allowed. Allowed: ${allowedTypes.join(', ')}`)
      onError?.(`Invalid file type: ${selectedFile.type}`)
      return
    }

    const maxSize = maxSizeFor(effectiveType)
    if (selectedFile.size > maxSize) {
      setState('error')
      setErrorMsg(`File too large (${fmtSize(selectedFile.size)}). Maximum: ${fmtSize(maxSize)}`)
      onError?.(`File too large: ${selectedFile.size} bytes`)
      return
    }

    let durationSeconds: number | undefined
    if (isAudioType(effectiveType)) {
      try {
        durationSeconds = Math.round(await readAudioDuration(selectedFile))
      } catch {
        setState('error')
        setErrorMsg('Could not read the audio duration. Try a valid M4A or MP3 file.')
        onError?.('Audio duration could not be read')
        return
      }
      if (durationSeconds < 30 || durationSeconds > 3600) {
        setState('error')
        setErrorMsg('Audio must be between 30 seconds and 60 minutes.')
        onError?.('Audio duration out of range')
        return
      }
    }

    setState('presigning')
    let presignResp: { uploadUrl: string; objectKey: string; expiresAt: string }
    try {
      presignResp = await api.media.presign(effectiveType, selectedFile.size, selectedFile.name)
    } catch {
      setState('error')
      setErrorMsg('Could not start the upload. The storage service may be unavailable.')
      onError?.('Presign request failed')
      return
    }

    setState('uploading')
    setProgress(0)
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed with status ${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.open('PUT', presignResp.uploadUrl)
        xhr.setRequestHeader('Content-Type', effectiveType)
        xhr.send(selectedFile)
      })
    } catch (err) {
      setState('error')
      setErrorMsg('Upload failed. Check your connection and retry.')
      onError?.('R2 upload failed')
      return
    }

    setState('completing')
    try {
      const mediaType = isAudioType(effectiveType)
        ? 'audio'
        : effectiveType === 'video/mp4'
        ? 'video'
        : effectiveType === 'application/pdf'
        ? 'pdf'
        : 'image'
      const completeResp = await api.media.complete(presignResp.objectKey, {
        ...metadata,
        type: metadata?.type ?? mediaType,
        entityType: metadata?.entityType ?? entityType,
        entityId: metadata?.entityId ?? entityId,
        durationSeconds,
      })
      setState('done')
      const uploadResult: MediaUploadResult = {
        id: completeResp.id,
        objectKey: presignResp.objectKey,
        status: completeResp.status,
        url: completeResp.url,
        thumbnailUrl: completeResp.thumbnailUrl,
        durationSeconds,
        contentType: effectiveType,
        sizeBytes: selectedFile.size,
      }
      setResult(uploadResult)
      onComplete(uploadResult)
    } catch {
      setState('error')
      setErrorMsg('The file uploaded but could not be attached. Retry or contact support.')
      onError?.('Complete request failed')
    }
  }, [api, allowedTypes, metadata, entityType, entityId, onComplete, onError])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    if (autoUpload) void startUpload(selectedFile)
  }, [autoUpload, startUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (state !== 'idle') return
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return
    setFile(dropped)
    if (autoUpload) void startUpload(dropped)
    else if (inputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(dropped)
      inputRef.current.files = dt.files
    }
  }, [state, autoUpload, startUpload])

  function SpinnerIcon() {
    return <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--forest)] border-t-transparent" />
  }

  const stateDisplay = () => {
    switch (state) {
      case 'validating':
        return { icon: <SpinnerIcon />, text: 'Validating file...' }
      case 'presigning':
        return { icon: <SpinnerIcon />, text: 'Requesting upload URL...' }
      case 'uploading':
        return { icon: <CloudArrowUp className="h-5 w-5" weight="duotone" />, text: `Uploading... ${progress}%` }
      case 'completing':
        return { icon: <SpinnerIcon />, text: 'Finalizing upload...' }
      case 'done':
        return { icon: <CheckCircle className="h-5 w-5 text-[var(--leaf)]" weight="fill" />, text: 'Upload complete' }
      case 'error':
        return { icon: <XCircle className="h-5 w-5 text-destructive" weight="fill" />, text: errorMsg ?? 'Upload failed' }
      default:
        return null
    }
  }

  const sd = stateDisplay()

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        aria-label={`${label} file input`}
        accept={allowedTypes.join(',')}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
        disabled={state === 'uploading' || state === 'completing' || state === 'presigning'}
      />

      <div
        role={state === 'idle' ? 'button' : 'status'}
        tabIndex={state === 'idle' ? 0 : -1}
        aria-label={state === 'idle' ? label : undefined}
        onClick={() => state === 'idle' && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (state !== 'idle') return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors ${compact ? 'gap-2 p-3' : 'flex-col p-6'} ${
          state === 'done'
            ? 'border-[var(--leaf)] bg-[var(--leaf-bg)]'
            : state === 'error'
            ? 'border-[var(--error)] bg-[var(--error-container)]'
            : state !== 'idle'
            ? 'border-[var(--forest)] bg-[var(--surface-2)]'
            : 'border-[var(--surface-4)] hover:border-[var(--forest)] hover:bg-[var(--surface-2)]'
        }`}
      >
        {sd ? (
          <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
            {sd.icon}
            <span className="text-sm font-semibold text-foreground">{sd.text}</span>
            {state === 'uploading' && (
              <div className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            {state === 'idle' && file && <span className="text-xs text-[var(--on-surface-variant)]">{file.name} ({fmtSize(file.size)})</span>}
            {state === 'idle' && file && !autoUpload && (
              <button onClick={(e) => { e.stopPropagation(); if (file) void startUpload(file) }} className="mt-1 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                Upload {file.name.length > 24 ? `${file.name.substring(0, 24)}…` : file.name}
              </button>
            )}
            {(state === 'error' || state === 'done') && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (state === 'error' && file) void startUpload(file)
                  else reset()
                }}
                className="mt-1 text-xs font-semibold text-primary hover:underline"
              >
                {state === 'done' ? 'Upload another' : 'Retry'}
              </button>
            )}
          </div>
        ) : compact ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CloudArrowUp className="h-5 w-5 text-[var(--on-surface-variant)]" weight="duotone" />
            {label}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudArrowUp className="h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs text-[var(--on-surface-variant)]">or drag & drop — max {file ? (maxSizeFor(file.type) >= MAX_VIDEO_SIZE ? '100 MB' : '10 MB') : '100 MB for audio/video, 10 MB for images'}</span>
          </div>
        )}
      </div>

      {result && state === 'done' && (
        <div className="mt-2 text-xs text-[var(--leaf)]">Upload complete.</div>
      )}
    </div>
  )
}
