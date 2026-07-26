import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import {
  BookOpen, Video, FileText, FilePdf, CheckCircle, Clock,
  PencilSimple, FloppyDisk, X, PlusCircle, Sparkle,
} from '@phosphor-icons/react'

interface Lesson { id: string; title: string; type: string; duration: number; url: string; hasTranscript: boolean; hasCaption: boolean }
interface QuizQuestion { id: string; text: string; options: string[]; correctIndex: number }
interface Course { id: string; title: string; description: string; difficulty: string; status: string; lessons: Lesson[]; lessonCount: number; passThreshold: number; quizQuestions: QuizQuestion[]; certificateEnabled: boolean; enrollmentCount: number; completionCount: number; createdAt: string; updatedAt: string }

const difficultyColors: Record<string, string> = { beginner: 'var(--leaf)', intermediate: 'var(--amber-deep)', advanced: 'var(--error)' }

function StatusPill({ status }: { status: string }) {
  const s = status === 'published' ? { bg: 'var(--leaf-bg)', text: 'var(--leaf)' } : { bg: 'var(--surface-2)', text: 'var(--on-surface-variant)' }
  return <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'video') return <Video className="h-4 w-4 text-[var(--forest)]" weight="duotone" />
  if (type === 'pdf') return <FilePdf className="h-4 w-4 text-[var(--error)]" weight="duotone" />
  return <FileText className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" />
}

export const Route = createFileRoute('/_authenticated/lms')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'lms', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: LmsPage })

function LmsPage() {
  const [data, setData] = useState<Course[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState('lessons')
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)

  useEffect(() => { api.list('courses').then(r => setData(r.items as Course[])) }, [])

  const selected = data?.find(c => c.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id); setActiveTab('lessons')
    const c = data?.find(c => c.id === id)
    if (c) { setEditData({ ...c }); setSelectedLesson(c.lessons[0]?.id ?? null) }
  }, [selectedId, data])

  const handleSave = useCallback(async () => {
    if (!selectedId || !editData) return
    await api.update('courses', selectedId, editData)
    const r = await api.list('courses')
    setData(r.items as Course[]); setSelectedId(null)
  }, [selectedId, editData])

  const handleField = (field: string, value: unknown) => setEditData(prev => prev ? { ...prev, [field]: value } : prev)

  const handleLessonField = (lessonId: string, field: string, value: unknown) => {
    if (!editData) return
    setEditData({ ...editData, lessons: editData.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l) })
  }

  const TABS = [
    { key: 'lessons', label: 'Lessons' }, { key: 'quiz', label: 'Quiz' },
    { key: 'certificate', label: 'Certificate' }, { key: 'settings', label: 'Settings' },
  ] as const

  const selectedLessonData = editData?.lessons.find(l => l.id === selectedLesson) ?? null

  if (!data) return <div className="mt-8 text-center text-sm text-[var(--on-surface-variant)]">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Learning Hub & Course Builder</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Create and manage courses, quizzes, and certifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} courses</span>
          <button className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> New Course</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
              <th className="px-5 py-3">Course Title</th><th className="px-5 py-3">Difficulty</th><th className="px-5 py-3">Lessons</th><th className="px-5 py-3">Enrolled</th><th className="px-5 py-3">Completed</th><th className="px-5 py-3">Status</th><th className="w-16 px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.map(c => {
              const rate = c.enrollmentCount > 0 ? Math.round((c.completionCount / c.enrollmentCount) * 100) : 0
              const isSelected = selectedId === c.id
              return (
                <FragmentRow key={c.id}>
                  <tr onClick={() => handleSelect(c.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><span className="font-semibold text-[var(--on-surface)]">{c.title}</span></td>
                    <td className="px-5 py-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${difficultyColors[c.difficulty]}20`, color: difficultyColors[c.difficulty] }}>{c.difficulty}</span></td>
                    <td className="px-5 py-3 text-[var(--on-surface-variant)]">{c.lessonCount}</td>
                    <td className="px-5 py-3 text-[var(--on-surface-variant)]">{c.enrollmentCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate > 70 ? 'var(--leaf)' : rate > 40 ? 'var(--amber)' : 'var(--error)' }} /></div>
                        <span className="text-xs text-[var(--on-surface-variant)]">{c.completionCount} ({rate}%)</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><StatusPill status={c.status} /></td>
                    <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                  </tr>
                  {isSelected && editData && (
                    <tr>
                      <td colSpan={7} className="border-b p-0">
                        <div className="border-t border-[var(--surface-4)]">
                          <div className="flex gap-1 border-b border-[var(--surface-4)] bg-white px-5 pt-3">
                            {TABS.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'}`}>{t.label}</button>)}
                          </div>
                          <div className="bg-white px-6 py-5">

                            {/* Lessons tab */}
                            {activeTab === 'lessons' && (
                              <div className="flex gap-6">
                                <div className="w-64 shrink-0">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--on-surface)]">Module Lessons</span>
                                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px]">{editData.lessons.length}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {editData.lessons.map(l => (
                                      <button key={l.id} onClick={() => setSelectedLesson(l.id)} className={`flex w-full items-center gap-2 rounded-lg p-2.5 text-left text-xs ${selectedLesson === l.id ? 'bg-[var(--amber-bg)]' : 'hover:bg-[var(--surface-2)]'}`}>
                                        <TypeIcon type={l.type} />
                                        <div className="min-w-0 flex-1"><div className="truncate font-semibold text-[var(--on-surface)]">{l.title}</div><div className="text-[10px] text-[var(--on-surface-variant)]">{l.type} · {l.duration} min</div></div>
                                        {l.hasCaption && <CheckCircle className="h-3 w-3 shrink-0 text-[var(--leaf)]" weight="fill" />}
                                      </button>
                                    ))}
                                    <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--surface-4)] p-2.5 text-xs text-[var(--on-surface-variant)] hover:border-[var(--forest)]"><PlusCircle className="h-4 w-4" weight="duotone" /> Add Lesson</button>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  {selectedLessonData && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2"><TypeIcon type={selectedLessonData.type} /><input value={selectedLessonData.title} onChange={e => handleLessonField(selectedLessonData.id, 'title', e.target.value)} className="flex-1 rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <LField label="Type" value={selectedLessonData.type} onChange={v => handleLessonField(selectedLessonData.id, 'type', v)} />
                                        <LField label="Duration (min)" value={String(selectedLessonData.duration)} onChange={v => handleLessonField(selectedLessonData.id, 'duration', Number(v))} />
                                        <LField label="URL" value={selectedLessonData.url} onChange={v => handleLessonField(selectedLessonData.id, 'url', v)} />
                                        <div className="flex items-center gap-4 pt-6">
                                          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--on-surface)]"><input type="checkbox" checked={selectedLessonData.hasTranscript} onChange={e => handleLessonField(selectedLessonData.id, 'hasTranscript', e.target.checked)} className="accent-[var(--forest)]" /> Transcript</label>
                                          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--on-surface)]"><input type="checkbox" checked={selectedLessonData.hasCaption} onChange={e => handleLessonField(selectedLessonData.id, 'hasCaption', e.target.checked)} className="accent-[var(--forest)]" /> Captions</label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Quiz tab */}
                            {activeTab === 'quiz' && (
                              <div>
                                <div className="mb-4 flex items-center gap-4">
                                  <label className="text-xs font-semibold text-[var(--on-surface)]">Pass threshold</label>
                                  <input type="range" min={0} max={100} value={editData.passThreshold} onChange={e => handleField('passThreshold', Number(e.target.value))} className="w-40 accent-[var(--forest)]" />
                                  <span className="text-sm font-bold text-[var(--forest)]">{editData.passThreshold}%</span>
                                </div>
                                <div className="space-y-3">
                                  {editData.quizQuestions.map((q, i) => (
                                    <div key={q.id} className="rounded-lg border border-[var(--surface-4)] p-4">
                                      <div className="flex items-center gap-2"><span className="text-xs font-bold text-[var(--on-surface-variant)]">Q{i + 1}</span><input value={q.text} onChange={e => { const qs = [...editData.quizQuestions]; qs[i] = { ...qs[i], text: e.target.value }; handleField('quizQuestions', qs) }} className="flex-1 rounded-md border border-[var(--outline-muted)] px-3 py-1.5 text-sm text-[var(--on-surface)]" /></div>
                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                        {q.options.map((o, oi) => (
                                          <label key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${oi === q.correctIndex ? 'border-[var(--leaf)] bg-[var(--leaf-bg)]' : 'border-[var(--surface-4)]'}`}>
                                            <input type="radio" name={`q-${q.id}`} checked={oi === q.correctIndex} onChange={() => { const qs = [...editData.quizQuestions]; qs[i] = { ...qs[i], correctIndex: oi }; handleField('quizQuestions', qs) }} className="sr-only" />
                                            <span className="w-4 text-[var(--on-surface-variant)]">{String.fromCharCode(65 + oi)}.</span> {o}
                                            {oi === q.correctIndex && <CheckCircle className="ml-auto h-3.5 w-3.5 text-[var(--leaf)]" weight="fill" />}
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--forest)] hover:underline"><PlusCircle className="h-4 w-4" weight="duotone" /> Add Question</button>
                                </div>
                              </div>
                            )}

                            {/* Certificate tab */}
                            {activeTab === 'certificate' && (
                              <div>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.certificateEnabled} onChange={e => handleField('certificateEnabled', e.target.checked)} className="accent-[var(--forest)]" /><span className="text-sm font-semibold text-[var(--on-surface)]">Auto-generate certificate on quiz pass</span></label>
                                {editData.certificateEnabled && (
                                  <div className="mt-5 flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                    <div className="text-center">
                                      <Sparkle className="mx-auto h-8 w-8 text-[var(--forest)]" weight="duotone" />
                                      <p className="mt-2 text-xs font-semibold text-[var(--on-surface)]">Certificate Template Preview</p>
                                      <p className="mt-1 text-[10px] text-[var(--on-surface-variant)]">{editData.title} — Completed by [learner name] — [completion date]</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Settings tab */}
                            {activeTab === 'settings' && (
                              <div className="grid grid-cols-2 gap-4">
                                <SField label="Title" value={editData.title} onChange={v => handleField('title', v)} className="col-span-2" />
                                <SField label="Description" value={editData.description} onChange={v => handleField('description', v)} className="col-span-2" />
                                <Select label="Difficulty" value={editData.difficulty} options={['beginner', 'intermediate', 'advanced']} onChange={v => handleField('difficulty', v)} />
                                <Select label="Status" value={editData.status} options={['draft', 'published']} onChange={v => handleField('status', v)} />
                                <SField label="Category" value={editData.category ?? ''} onChange={v => handleField('category', v)} />
                              </div>
                            )}

                            <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                              <button onClick={handleSave} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm"><FloppyDisk className="h-4 w-4" weight="duotone" /> Save Changes</button>
                              <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]"><X className="h-4 w-4" weight="duotone" /> Cancel</button>
                            </div>

                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-[var(--on-surface-variant)]">§7.1 Media readiness: lessons with captions/transcripts show a <CheckCircle className="inline h-3 w-3 text-[var(--leaf)]" weight="fill" /> checkmark.</p>
    </div>
  )
}

function LField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
}
function SField({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return <div className={className}><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <div><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]">{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
}
function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</> }
