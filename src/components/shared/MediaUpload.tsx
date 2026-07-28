import { useState, useRef, useCallback } from 'react'
import { useApi } from '#/lib/api/use-api'
import { CloudArrowUp, CheckCircle, XCircle } from '@phosphor-icons/react'

type UploadState = 'idle' | 'validating' | 'presigning' | 'uploading' | 'completing' | 'done' | 'error'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'] as const
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024

export interface MediaUploadResult {
  id: string
  objectKey: string
  status: string
}

interface MediaUploadProps {
  label?: string
  allowedTypes?: readonly string[]
  metadata?: { caption?: string; altText?: string; credit?: string }
  onComplete: (result: MediaUploadResult) => void
  onError?: (error: string) => void
  autoUpload?: boolean
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function MediaUpload({ label = 'Upload File', allowedTypes = ALLOWED_TYPES, metadata, onComplete, onError, autoUpload = true }: MediaUploadProps) {
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

    if (!allowedTypes.includes(selectedFile.type)) {
      setState('error')
      setErrorMsg(`File type "${selectedFile.type}" not allowed. Allowed: ${allowedTypes.join(', ')}`)
      onError?.(`Invalid file type: ${selectedFile.type}`)
      return
    }

    const maxSize = selectedFile.type === 'video/mp4' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (selectedFile.size > maxSize) {
      setState('error')
      setErrorMsg(`File too large (${fmtSize(selectedFile.size)}). Maximum: ${fmtSize(maxSize)}`)
      onError?.(`File too large: ${selectedFile.size} bytes`)
      return
    }

    setState('presigning')
    let presignResp: { uploadUrl: string; objectKey: string; expiresAt: string }
    try {
      presignResp = await api.media.presign(selectedFile.type, selectedFile.size, selectedFile.name)
    } catch {
      setState('error')
      setErrorMsg('Failed to request upload URL')
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
        xhr.setRequestHeader('Content-Type', selectedFile.type)
        xhr.send(selectedFile)
      })
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      onError?.('R2 upload failed')
      return
    }

    setState('completing')
    try {
      const completeResp = await api.media.complete(presignResp.objectKey, metadata)
      setState('done')
      setResult({ id: completeResp.id, objectKey: presignResp.objectKey, status: completeResp.status })
      onComplete({ id: completeResp.id, objectKey: presignResp.objectKey, status: completeResp.status })
    } catch {
      setState('error')
      setErrorMsg('Failed to finalize upload')
      onError?.('Complete request failed')
    }
  }, [api, allowedTypes, onComplete, onError])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    if (autoUpload) startUpload(selectedFile)
  }, [autoUpload, startUpload])

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
        accept={allowedTypes.join(',')}
        onChange={handleFileChange}
        className="sr-only"
        disabled={state === 'uploading' || state === 'completing' || state === 'presigning'}
      />

      <div
        onClick={() => state === 'idle' && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          state === 'done'
            ? 'border-[var(--leaf)] bg-[var(--leaf-bg)]'
            : state === 'error'
            ? 'border-[var(--error)] bg-red-50'
            : state !== 'idle'
            ? 'border-[var(--forest)] bg-[var(--surface-2)]'
            : 'border-[var(--surface-4)] hover:border-[var(--forest)] hover:bg-[var(--surface-2)]'
        }`}
      >
        {sd ? (
          <div className="flex flex-col items-center gap-2">
            {sd.icon}
            <span className="text-sm font-semibold text-[var(--on-surface)]">{sd.text}</span>
            {state === 'uploading' && (
              <div className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            {state === 'idle' && file && <span className="text-xs text-[var(--on-surface-variant)]">{file.name} ({fmtSize(file.size)})</span>}
            {(state === 'error' || state === 'done') && (
              <button onClick={(e) => { e.stopPropagation(); reset() }} className="mt-1 text-xs font-semibold text-primary hover:underline">
                {state === 'done' ? 'Upload another' : 'Try again'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudArrowUp className="h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
            <span className="text-sm font-semibold text-[var(--on-surface)]">{label}</span>
            <span className="text-xs text-[var(--on-surface-variant)]">or drag & drop — max {file?.type === 'video/mp4' ? '100 MB' : '10 MB'}</span>
          </div>
        )}
      </div>

      {result && state === 'done' && (
        <div className="mt-2 text-xs text-[var(--leaf)]">
          File uploaded — ID: {result.id.substring(0, 8)}...
        </div>
      )}
    </div>
  )
}
