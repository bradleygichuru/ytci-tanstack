import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { PaginationParams } from './types'

export interface UserItem {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'administrator' | 'moderator' | 'county_officer'
  banned: boolean
  banReason?: string | null
  ageRange?: string | null
  county?: string | null
  languages?: string | null
  preferences?: string | null
  consentGrantedAt?: string | null
  createdAt: string
}

export interface AuditItem {
  id: string
  userId: string
  userName: string
  action: string
  details: string | null
  performedBy: string
  performedByName: string
  createdAt: string
}

export function usersApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams & { search?: string; role?: string; banned?: string; sortBy?: string; sortDirection?: string }) =>
      apiRequest<{ users: UserItem[]; total: number }>(config, '/api/admin/users/list', { params }),
    audit: (params?: PaginationParams) =>
      apiRequest<{ items: AuditItem[] }>(config, '/api/admin/users/audit', { params }),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ user: UserItem; tempPassword: string }>(config, '/api/admin/users/create', { method: 'POST', body }),
    update: (body: Record<string, unknown>) =>
      apiRequest<UserItem>(config, '/api/admin/users/update', { method: 'POST', body }),
  }
}
