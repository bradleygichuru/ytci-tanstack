import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '#/lib/api/client'

export const Route = createFileRoute('/_authenticated/events')({
  component: EventsPage,
})

function EventsPage() {
  const [data, setData] = useState<{ items: unknown[] } | null>(null)

  useEffect(() => {
    api.list('events').then(setData)
  }, [])

  return (
    <div>
      <h1 className="font-sans text-3xl font-bold tracking-tight text-[#191c1d]">
        Events Calendar Admin
      </h1>
      <p className="mt-1 text-sm text-[#42493e]">
        Publish and manage event entries. Scheduled, postponed, cancelled status transitions.
      </p>

      <div className="mt-6 rounded-lg border border-[#e7e8e9] bg-white p-6 shadow-sm">
        <h2 className="font-sans text-base font-semibold text-[#191c1d]">Mock API Status</h2>
        <p className="mt-1 text-sm text-[#42493e]">
          {data ? `Connected — ${data.items.length} events loaded` : 'Connecting...'}
        </p>
      </div>
    </div>
  )
}
