import type { ApiConfig } from './client'
import { apiRequest } from './client'

export type RepositoryKind =
  | 'competition_entry'
  | 'innovation'
  | 'conservation_resource'
  | 'experience'

export type RepositoryStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived'

export interface RepositoryMedia {
  id?: string
  url: string
  alt: string
  caption?: string | null
  credit?: string | null
  sortOrder?: number
  expiresAt?: string
}

export interface RepositoryEntryAdmin {
  id: string
  kind: RepositoryKind
  slug: string
  title: string
  summary: string
  bodyMd: string
  county: string | null
  category: string | null
  tags: string[]
  authorName?: string | null
  authorEmail?: string | null
  authorPhone?: string | null
  authorAgeBand?: string | null
  authorOrg?: string | null
  teamMembers?: Array<{ name: string; role?: string }> | null
  competitionName?: string | null
  competitionCategory?: string | null
  coverMediaId?: string | null
  coverImage?: RepositoryMedia | null
  documentMediaId?: string | null
  document?: {
    url: string
    fileName?: string
    mimeType?: string
    sizeBytes?: number
  } | null
  gallery: Array<RepositoryMedia>
  externalUrl?: string | null
  embedUrl?: string | null
  embedProvider?: string | null
  status: RepositoryStatus
  source: 'admin' | 'public'
  featured: boolean
  moderationNote?: string | null
  referenceCode?: string | null
  consentAt?: string | null
  consentVersion?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface RepositoryList {
  items: Array<RepositoryEntryAdmin>
  nextCursor: string | null
  hasMore: boolean
}

export interface RepositorySettings {
  id: string
  submissionsOpen: boolean
  submissionIntro: string | null
  termsVersion: string
  updatedAt: string
}

export interface RepositoryListParams {
  status?: RepositoryStatus
  kind?: RepositoryKind
  q?: string
  cursor?: string | null
  limit?: number
}

export interface RepositoryEntryInput {
  kind?: RepositoryKind
  slug?: string
  title?: string
  summary?: string
  bodyMd?: string
  county?: string | null
  category?: string | null
  tags?: string[]
  authorName?: string | null
  authorEmail?: string | null
  authorPhone?: string | null
  authorAgeBand?: string | null
  authorOrg?: string | null
  competitionName?: string | null
  competitionCategory?: string | null
  coverMediaId?: string | null
  documentMediaId?: string | null
  galleryMediaIds?: string[]
  externalUrl?: string | null
  embedUrl?: string | null
  featured?: boolean
  status?: 'draft' | 'published'
}

export function repositoryApi(config: ApiConfig) {
  return {
    entries: {
      list: (params?: RepositoryListParams) =>
        apiRequest<RepositoryList>(config, '/v1/admin/repository/entries', {
          params: params
            ? {
                status: params.status,
                kind: params.kind,
                q: params.q,
                cursor: params.cursor ?? undefined,
                limit: params.limit,
              }
            : undefined,
        }),
      get: (id: string) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}`),
      create: (body: RepositoryEntryInput) =>
        apiRequest<RepositoryEntryAdmin>(config, '/v1/admin/repository/entries', {
          method: 'POST',
          body,
        }),
      update: (id: string, patch: RepositoryEntryInput) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}`, {
          method: 'PATCH',
          body: patch,
        }),
      remove: (id: string) =>
        apiRequest<void>(config, `/v1/admin/repository/entries/${id}`, { method: 'DELETE' }),
      approve: (id: string, note?: string) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}/approve`, {
          method: 'POST',
          body: { note },
        }),
      publish: (id: string) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}/publish`, {
          method: 'POST',
        }),
      unpublish: (id: string) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}/unpublish`, {
          method: 'POST',
        }),
      feature: (id: string, featured: boolean) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}/feature`, {
          method: 'POST',
          body: { featured },
        }),
      reject: (id: string, note: string) =>
        apiRequest<RepositoryEntryAdmin>(config, `/v1/admin/repository/entries/${id}/reject`, {
          method: 'POST',
          body: { note },
        }),
    },
    settings: {
      get: () => apiRequest<RepositorySettings>(config, '/v1/admin/repository/settings'),
      update: (patch: Partial<Pick<RepositorySettings, 'submissionsOpen' | 'submissionIntro' | 'termsVersion'>>) =>
        apiRequest<RepositorySettings>(config, '/v1/admin/repository/settings', {
          method: 'PATCH',
          body: patch,
        }),
    },
  }
}
