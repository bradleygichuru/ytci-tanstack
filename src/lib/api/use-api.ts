import { useMemo } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { createApiClient } from './index'
import type { ApiConfig } from './client'

export function useApi() {
  const context = useRouteContext({ from: '/_authenticated' })
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/v1'
  const config: ApiConfig = { baseUrl, token: context.token ?? undefined }
  return useMemo(() => createApiClient(config), [config.token, config.baseUrl])
}
