import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '#/lib/api/client'
import {
  Shield, Database, Gear, ChatDots, Code, PlusCircle,
  CheckCircle, XCircle, MapPin, ArrowSquareUpRight,
} from '@phosphor-icons/react'

interface AiSource { id: string; name: string; url: string; type: string; enabled: boolean }
interface AiFeedback { id: string; query: string; rating: number; comment: string; reviewed: boolean; createdAt: string }

export const Route = createFileRoute('/_authenticated/ai-config')({ component: AiConfigPage })

function AiConfigPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [d, setD] = useState<Record<string, unknown> | null>(null)
  const [srcInput, setSrcInput] = useState('')
  const [fbFilter, setFbFilter] = useState<'all' | 'unreviewed'>('unreviewed')

  useEffect(() => { api.list('ai-config').then(r => { const d = r.items[0] as Record<string, unknown>; setData(d); setD({ ...d }) }) }, [])

  useEffect(() => { if (d && data && JSON.stringify(d) !== JSON.stringify(data)) api.update('ai-config', 'config', d) }, [d])

  const update = (k: string, v: unknown) => setD(prev => prev ? { ...prev, [k]: v } : prev)
  const getVal = (key: string) => (d as Record<string, unknown>)?.[key]

  const guardrails = (d?.guardrails as Record<string, boolean>) ?? {}
  const sources = (d?.approvedSources as AiSource[]) ?? []
  const fb = (d?.feedback as AiFeedback[]) ?? []

  if (!d) return <div className="mt-8 text-center text-sm text-[var(--on-surface-variant)]">Loading...</div>

  return (
    <div>
      <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">AI Engine Configuration & Guardrails</h1>
      <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Safety escalations, approved data sources, inference management, and answer feedback.</p>

      <div className="mt-8 space-y-8">
        {/* Card 1 — Safety Guardrails */}
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 border-b border-[var(--surface-4)] bg-[var(--surface-2)] px-6 py-4">
            <Shield className="h-5 w-5 text-[var(--forest)]" weight="duotone" />
            <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">Safety Guardrails Policy</h2>
          </div>
          <div className="p-6">
            <div className="mb-4 rounded-lg border border-[var(--surface-4)] bg-[var(--surface-2)] p-4 font-mono text-xs leading-relaxed text-[var(--on-surface)]">
              <span className="text-[var(--forest)] font-semibold">// ai.content_guardrails</span>
              {Object.entries(guardrails).slice(0, 8).map(([k, v]) => (
                <div key={k} className="mt-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${v ? 'bg-[var(--leaf)]' : 'bg-[var(--on-surface-variant)]'}`} />
                  <span className={v ? '' : 'text-[var(--on-surface-variant)]'}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: {v ? 'true' : 'false'}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { k: 'noInventOpeningHours', label: 'Don\'t invent opening hours' },
                { k: 'noInventPrices', label: 'Don\'t invent prices' },
                { k: 'noInventSafety', label: 'Don\'t invent safety guarantees' },
                { k: 'noInventContacts', label: 'Don\'t invent contact details' },
                { k: 'showLastUpdate', label: 'Show last-update date for volatile info' },
                { k: 'noCheckoutLinks', label: 'No checkout links in responses' },
                { k: 'protectSensitiveSites', label: 'Protect sensitive conservation sites' },
                { k: 'protectUserData', label: 'Protect personal user data' },
              ].map(g => (
                <label key={g.k} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--surface-4)] p-3 text-sm">
                  <input type="checkbox" checked={guardrails[g.k] ?? false} onChange={e => { setD(prev => prev ? { ...prev, guardrails: { ...guardrails, [g.k]: e.target.checked } } : prev) }} className="accent-[var(--forest)]" />
                  <span className="text-[var(--on-surface)]">{g.label}</span>
                  {guardrails[g.k] ? <CheckCircle className="ml-auto h-4 w-4 text-[var(--leaf)]" weight="fill" /> : <XCircle className="ml-auto h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" />}
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--surface-4)] p-3 text-sm">
                <input type="checkbox" checked={guardrails.reportAnswerControl ?? false} onChange={e => { setD(prev => prev ? { ...prev, guardrails: { ...guardrails, reportAnswerControl: e.target.checked } } : prev) }} className="accent-[var(--forest)]" />
                <span className="text-[var(--on-surface)]">Report-answer control + human review dashboard</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--surface-4)] p-3 text-sm">
                <input type="checkbox" checked={guardrails.deterministicFallback ?? false} onChange={e => { setD(prev => prev ? { ...prev, guardrails: { ...guardrails, deterministicFallback: e.target.checked } } : prev) }} className="accent-[var(--forest)]" />
                <span className="text-[var(--on-surface)]">Deterministic fallback itinerary when AI unavailable</span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2 — Grounding Databases */}
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 border-b border-[var(--surface-4)] bg-[var(--surface-2)] px-6 py-4">
            <Database className="h-5 w-5 text-[var(--forest)]" weight="duotone" />
            <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">Grounding Databases</h2>
          </div>
          <div className="p-6">
            <p className="mb-4 text-sm text-[var(--on-surface-variant)]">Authorised data sources the AI Travel Companion may query for real-time tourism guidance.</p>
            <div className="space-y-3">
              {sources.map(src => (
                <div key={src.id} className="flex items-center gap-3 rounded-lg border border-[var(--surface-4)] p-3 text-sm">
                  <input type="checkbox" checked={src.enabled} onChange={e => { setD(prev => prev ? { ...prev, approvedSources: sources.map(s => s.id === src.id ? { ...s, enabled: e.target.checked } : s) } : prev) }} className="accent-[var(--forest)]" />
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--on-surface)]">{src.name}</div>
                    <div className="text-xs text-[var(--on-surface-variant)]"><Code className="inline h-3 w-3" weight="duotone" /> {src.type}<span className="mx-2">·</span>{src.url}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${src.enabled ? 'bg-[var(--leaf-bg)] text-[var(--leaf)]' : 'bg-[var(--surface-2)] text-[var(--on-surface-variant)]'}`}>{src.enabled ? 'Active' : 'Disabled'}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input value={srcInput} onChange={e => setSrcInput(e.target.value)} placeholder="Source name or URL..." className="flex-1 rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:border-[var(--forest)]" />
              <button className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> Add Source</button>
            </div>
          </div>
        </div>

        {/* Card 3 — Inference & Optimization */}
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 border-b border-[var(--surface-4)] bg-[var(--surface-2)] px-6 py-4">
            <Gear className="h-5 w-5 text-[var(--forest)]" weight="duotone" />
            <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">Inference & Optimization</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Slider label="Rate Limit (requests/min)" min={1} max={100} value={getVal('rateLimitPerMinute') as number} onChange={v => update('rateLimitPerMinute', v)} />
              <Slider label="Token Budget (tokens/hour)" min={10000} max={500000} step={5000} value={getVal('tokenBudgetPerHour') as number} onChange={v => update('tokenBudgetPerHour', v)} />
              <Slider label="Model Temperature" min={0} max={200} step={5} value={Math.round((getVal('modelTemperature') as number) * 100)} onChange={v => update('modelTemperature', v / 100)} fmt={v => (v / 100).toFixed(1)} />
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Max Tokens</label>
                <input type="number" min={256} max={8192} value={getVal('maxTokens') as number} onChange={e => update('maxTokens', Number(e.target.value))} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" />
              </div>
            </div>
            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold text-[var(--on-surface)]">Blocked Topics</label>
              <div className="flex flex-wrap gap-2">
                {(getVal('guardrailBlockedTopics') as string[] ?? []).map(t => (
                  <span key={t} className="flex items-center gap-1 rounded-full border border-[var(--surface-4)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--on-surface)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--error)]" /> {t.replace(/_/g, ' ')}
                    <button onClick={() => update('guardrailBlockedTopics', (getVal('guardrailBlockedTopics') as string[])?.filter(x => x !== t))} className="ml-1 text-[var(--on-surface-variant)] hover:text-[var(--error)]"><XCircle className="h-3.5 w-3.5" weight="duotone" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4 — Feedback Queue */}
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center gap-2 border-b border-[var(--surface-4)] bg-[var(--surface-2)] px-6 py-4">
            <ChatDots className="h-5 w-5 text-[var(--forest)]" weight="duotone" />
            <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">Answer Feedback</h2>
            <div className="ml-auto flex gap-1 rounded-full bg-[var(--surface-2)] p-0.5">
              {(['unreviewed', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFbFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${fbFilter === f ? 'bg-white text-[var(--on-surface)] shadow-sm' : 'text-[var(--on-surface-variant)]'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                <th className="px-6 py-3">Query</th><th className="px-6 py-3">Rating</th><th className="px-6 py-3">Comment</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Status</th>
              </tr></thead>
              <tbody>
                {(fbFilter === 'unreviewed' ? fb.filter(f => !f.reviewed) : fb).map(f => (
                  <tr key={f.id} className="border-b hover:bg-[var(--surface-2)]">
                    <td className="max-w-xs truncate px-6 py-3 text-sm font-semibold text-[var(--on-surface)]">{f.query}</td>
                    <td className="px-6 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${f.rating >= 4 ? 'text-[var(--leaf)] bg-[var(--leaf-bg)]' : f.rating >= 2 ? 'text-[var(--amber-deep)] bg-[var(--amber-bg)]' : 'text-[var(--error)] bg-[rgba(186,26,26,0.1)]'}`}>{f.rating}/5</span></td>
                    <td className="max-w-xs truncate px-6 py-3 text-xs text-[var(--on-surface-variant)]">{f.comment}</td>
                    <td className="px-6 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3">{f.reviewed ? <span className="text-[10px] font-semibold text-[var(--leaf)]">Reviewed</span> : <button className="rounded-full bg-[var(--forest)] px-3 py-1 text-[10px] font-bold text-white">Review</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Slider({ label, min, max, step = 1, value, onChange, fmt }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--on-surface)]">
        <span>{label}</span>
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-sm font-bold text-[var(--forest)]">{fmt ? fmt(value) : value.toLocaleString()}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[var(--forest)]" />
    </div>
  )
}
