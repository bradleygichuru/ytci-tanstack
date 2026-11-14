import { createFileRoute } from '@tanstack/react-router'
import {
  HttpError,
  handleCandidate,
  handleCoverage,
  handlePublish,
  handleQueue,
  handleReject,
  handleSaveDraft,
} from './-functions'

function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message, fields: error.fields, checks: error.checks },
      { status: error.status },
    )
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
  return Response.json({ error: message }, { status })
}

export const Route = createFileRoute('/api/admin/catalog/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const action = url.pathname.split('/').pop()
        const headers = Object.fromEntries(request.headers.entries())
        try {
          switch (action) {
            case 'queue':
              return Response.json(await handleQueue(headers, url.searchParams))
            case 'candidate': {
              const placeId = url.searchParams.get('placeId')
              if (!placeId) return Response.json({ error: 'Missing placeId' }, { status: 400 })
              return Response.json(await handleCandidate(headers, placeId))
            }
            case 'coverage':
              return Response.json(await handleCoverage(headers))
            default:
              return Response.json({ error: 'Not found' }, { status: 404 })
          }
        } catch (error) {
          return errorResponse(error)
        }
      },
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const action = url.pathname.split('/').pop()
        const headers = Object.fromEntries(request.headers.entries())
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
          switch (action) {
            case 'draft':
              return Response.json(await handleSaveDraft(headers, body))
            case 'publish':
              return Response.json(await handlePublish(headers, body))
            case 'reject':
              return Response.json(await handleReject(headers, body))
            default:
              return Response.json({ error: 'Not found' }, { status: 404 })
          }
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})
