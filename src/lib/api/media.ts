import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | '360'
export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'failed'

export interface MediaAsset {
  id: string
  objectKey: string
  type: MediaType
  status: MediaStatus
  url?: string | null
  thumbnailUrl?: string | null
  caption?: string | null
  altText?: string | null
  credit?: string | null
  fileSizeBytes?: number | null
  createdAt: string
}

export interface PresignResponse {
  uploadUrl: string
  objectKey: string
  expiresAt: string
}

export interface CompleteResponse {
  id: string
  status: string
}

export function mediaApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<MediaAsset>>(config, '/v1/media', { params }),
    presign: (contentType: string, fileSizeBytes: number, fileName: string) =>
      apiRequest<PresignResponse>(config, '/v1/media/presign', {
        method: 'POST',
        body: { contentType, fileSizeBytes, fileName },
      }),
    complete: (objectKey: string, metadata?: { caption?: string; altText?: string; credit?: string; thumbnailKey?: string }) =>
      apiRequest<CompleteResponse>(config, '/v1/media/complete', {
        method: 'POST',
        body: { objectKey, ...metadata },
      }),
    updateMetadata: (id: string, patch: { caption?: string; altText?: string; credit?: string }) =>
      apiRequest<{ status: string }>(config, `/v1/media/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) =>
      apiRequest<{ status: string }>(config, `/v1/media/${id}`, { method: 'DELETE' }),
  }
}
