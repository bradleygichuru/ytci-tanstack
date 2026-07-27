import { createFileRoute } from '@tanstack/react-router'
import { handleList, handleGet, handleCreate, handleUpdate, handleListAudit } from './-functions'

export const Route = createFileRoute('/api/admin/users/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const headers = Object.fromEntries(request.headers.entries())
        const action = url.pathname.split('/').pop()
        try {
          let result: unknown
          switch (action) {
            case 'list':
              result = await handleList(headers, url.searchParams)
              break
            case 'get': {
              const id = url.searchParams.get('id')
              if (!id) return new Response('Missing id', { status: 400 })
              result = await handleGet(headers, id)
              break
            }
            case 'audit':
              result = await handleListAudit(headers, url.searchParams)
              break
            default:
              return new Response('Not found', { status: 404 })
          }
          return Response.json(result)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error'
          const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500
          return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } })
        }
      },
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const headers = Object.fromEntries(request.headers.entries())
        const action = url.pathname.split('/').pop()
        try {
          const body = await request.json() as Record<string, unknown>
          let result: unknown
          switch (action) {
            case 'create':
              result = await handleCreate(headers, body)
              break
            case 'update': {
              const id = body.userId as string
              if (!id) return new Response('Missing userId', { status: 400 })
              result = await handleUpdate(headers, id, body)
              break
            }
            default:
              return new Response('Not found', { status: 404 })
          }
          return Response.json(result)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error'
          const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500
          return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } })
        }
      },
    },
  },
})
