import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import { useCursorPagination } from '#/lib/api/use-cursor-pagination'
import {
  Video, FileText, FilePdf, CheckCircle,
  PencilSimple, FloppyDisk, X, Plus, Trash, Sparkle,
} from '@phosphor-icons/react'
import { FormInput, FormSelect } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { CursorPagination } from '#/components/shared/CursorPagination'
import { LmsSkeleton } from '#/components/skeletons/lms-skeleton'
import { courseSchema } from '#/lib/schemas/course.schema'

interface Lesson { id: string; title: string; type: string; duration: number; url: string; hasTranscript: boolean; hasCaption: boolean }
interface QuizQuestion { id: string; text: string; options: string[]; correctIndex: number }
interface Course { id: string; title: string; description: string; category: string; difficulty: string; status: string; lessons: Lesson[]; lessonCount: number; passThreshold: number; quizQuestions: QuizQuestion[]; certificateEnabled: boolean; certificateTemplate: string; enrollmentCount: number; completionCount: number; badgeName?: string; badgeIconUrl?: string; imageUrl?: string; createdAt: string; updatedAt: string }

const difficultyColors: Record<string, string> = { beginner: 'var(--leaf)', intermediate: 'var(--amber-deep)', advanced: 'var(--error)' }

function TypeIcon({ type }: { type: string }) {
  if (type === 'video') return <Video className="h-4 w-4 text-primary" weight="duotone" />
  if (type === 'pdf') return <FilePdf className="h-4 w-4 text-destructive" weight="duotone" />
  return <FileText className="h-4 w-4 text-muted-foreground" weight="duotone" />
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

let nextLessonId = 100
let nextQId = 100

function emptyCourse(): Course {
  return { id: '', title: '', description: '', category: '', difficulty: 'beginner', status: 'draft', lessons: [], lessonCount: 0, passThreshold: 70, quizQuestions: [], certificateEnabled: false, certificateTemplate: 'standard', enrollmentCount: 0, completionCount: 0, createdAt: '', updatedAt: '' }
}

const TABS = [
  { key: 'lessons', label: 'Lessons' }, { key: 'quiz', label: 'Quiz' },
  { key: 'certificate', label: 'Certificate' }, { key: 'settings', label: 'Settings' },
] as const

function LmsPage() {
  const api = useApi()
  const [data, setData] = useState<Course[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [editData, setEditData] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState('lessons')
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { cursor, hasMore, setHasMore, setCursor, handleNext: handleNextCursor, handlePrev: handlePrevCursor } = useCursorPagination()

  const loadList = useCallback(async (c?: string | null) => {
    setLoading(true)
    try {
      const r = await api.courses.list(c ? { cursor: c } : undefined)
      setData(r.items)
      setHasMore(r.hasMore)
      setCursor(r.nextCursor)
    } catch {
      toast.error('Failed to load courses')
      setData(current => current === null ? [] : current)
    } finally {
      setLoading(false)
    }
  }, [api])

  const handleNext = useCallback(() => {
    handleNextCursor((c) => loadList(c))
  }, [handleNextCursor, loadList])

  const handlePrev = useCallback(() => {
    handlePrevCursor((c) => loadList(c))
  }, [handlePrevCursor, loadList])

  useEffect(() => { loadList() }, [loadList])

  const selected = data?.find(c => c.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id); setActiveTab('lessons'); setPanelMode('edit')
    const c = data?.find(c => c.id === id)
    if (c) { setEditData({ ...c, lessons: (c.lessons ?? []).map(l => ({ ...l })), quizQuestions: (c.quizQuestions ?? []).map((q: Record<string, unknown>) => ({ id: q.id, text: q.text || q.question, options: q.options, correctIndex: q.correctIndex })) }); setSelectedLesson((c.lessons ?? [])[0]?.id ?? null) }
    setErrors({})
  }, [selectedId, data])

  const handleNew = useCallback(() => {
    setSelectedId(null); setPanelMode('create'); setActiveTab('settings')
    setEditData(emptyCourse()); setSelectedLesson(null); setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    if (!editData) return false
    const result = courseSchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSave = useCallback(async () => {
    if (!editData) return
    if (!validate()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { ...editData }
      delete body.enrollmentCount
      delete body.completionCount
      delete body.lessonCount
      let courseId: string | undefined
      if (panelMode === 'create') {
        const created = await api.courses.create(body)
        courseId = created.id
        toast.success('Course created')
      } else if (selectedId) {
        await api.courses.update(selectedId, body)
        courseId = selectedId
        toast.success('Course saved')
      }

      if (courseId) {
        for (const lesson of editData.lessons) {
          try {
            await api.courses.createLesson(courseId, {
              title: lesson.title,
              contentType: lesson.type,
              contentUrl: lesson.url,
              duration: lesson.duration,
              displayOrder: 0,
            })
          } catch { /* lesson sync best-effort */ }
        }

        if (editData.quizQuestions.length > 0) {
          try {
            await api.courses.upsertQuiz(courseId, {
              title: editData.title,
              questions: editData.quizQuestions.map((q) => ({
                id: q.id,
                question: q.text,
                options: q.options,
                correctIndex: q.correctIndex,
              })),
              passThreshold: editData.passThreshold,
            })
          } catch { /* quiz sync best-effort */ }
        }
      }

      await loadList()
      if (panelMode === 'create') {
        setPanelMode('edit')
        setSelectedId(courseId ?? null)
      } else {
        setSelectedId(null); setPanelMode('view')
      }
    } catch {
      toast.error('Failed to save course')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedId, panelMode, api, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await api.courses.remove(selectedId)
      toast.success('Course deleted')
      setShowDelete(false); setSelectedId(null); setPanelMode('view')
      await loadList()
    } catch {
      toast.error('Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }, [selectedId, loadList, api])

  const handleLessonField = (lessonId: string, field: string, value: unknown) => {
    if (!editData) return
    setEditData({ ...editData, lessons: editData.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l) })
  }

  const handleAddLesson = () => {
    if (!editData) return
    const id = `l${nextLessonId++}`
    const newLesson: Lesson = { id, title: 'New Lesson', type: 'text', duration: 10, url: '', hasTranscript: false, hasCaption: false }
    setEditData({ ...editData, lessons: [...editData.lessons, newLesson], lessonCount: editData.lessons.length + 1 })
    setSelectedLesson(id)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!editData) return
    try {
      if (editData.id && selectedId) {
        await api.courses.deleteLesson(editData.id, lessonId)
      }
    } catch {
      toast.warning('Failed to delete lesson from server')
    }
    const remaining = editData.lessons.filter(l => l.id !== lessonId)
    setEditData({ ...editData, lessons: remaining, lessonCount: remaining.length })
    if (selectedLesson === lessonId) setSelectedLesson(remaining[0]?.id ?? null)
  }

  const handleAddQuestion = () => {
    if (!editData) return
    const id = `q${nextQId++}`
    const newQ: QuizQuestion = { id, text: 'New question?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndex: 0 }
    setEditData({ ...editData, quizQuestions: [...editData.quizQuestions, newQ] })
  }

  const handleDeleteQuestion = (qId: string) => {
    if (!editData) return
    setEditData({ ...editData, quizQuestions: editData.quizQuestions.filter(q => q.id !== qId) })
  }

  const selectedLessonData = editData?.lessons.find(l => l.id === selectedLesson) ?? null

  if (loading) return <LmsSkeleton />
  if (!data?.length && panelMode !== 'create') return <div className="mt-8 text-center text-sm text-muted-foreground">No courses yet. Create one to get started.</div>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Learning Hub & Course Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage courses, quizzes, and certifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{data?.length ?? 0} courses</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"><Plus className="h-4 w-4" weight="duotone" /> New Course</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3">Course Title</th><th className="px-5 py-3">Difficulty</th><th className="px-5 py-3">Lessons</th><th className="px-5 py-3">Enrolled</th><th className="px-5 py-3">Completed</th><th className="px-5 py-3">Status</th><th className="w-16 px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map(c => {
              const rate = c.enrollmentCount > 0 ? Math.round((c.completionCount / c.enrollmentCount) * 100) : 0
              const isSelected = selectedId === c.id
              return (
                <React.Fragment key={c.id}>
                  <tr onClick={() => handleSelect(c.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><span className="font-semibold text-foreground">{c.title}</span></td>
                    <td className="px-5 py-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${difficultyColors[c.difficulty]}20`, color: difficultyColors[c.difficulty] }}>{c.difficulty}</span></td>
                    <td className="px-5 py-3 text-muted-foreground">{c.lessonCount}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.enrollmentCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate > 70 ? 'var(--leaf)' : rate > 40 ? 'var(--amber)' : 'var(--error)' }} /></div>
                        <span className="text-xs text-muted-foreground">{c.completionCount} ({rate}%)</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                  </tr>
                  {isSelected && editData && (
                    <tr>
                      <td colSpan={7} className="border-b p-0">
                        <div className="border-t border-border">
                          <div className="flex gap-1 border-b border-border bg-card px-5 pt-3">
                            {TABS.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>{t.label}</button>)}
                          </div>
                          <div className="bg-card px-6 py-5">
                            {activeTab === 'lessons' && (
                              <div className="flex flex-col gap-6 md:flex-row">
                                <div className="w-full shrink-0 md:w-64">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Module Lessons</span>
                                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px]">{editData.lessons.length}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {editData.lessons.map(l => (
                                      <div key={l.id} className="flex items-center gap-1">
                                        <button onClick={() => setSelectedLesson(l.id)} className={`flex flex-1 items-center gap-2 rounded-lg p-2.5 text-left text-xs ${selectedLesson === l.id ? 'bg-[var(--amber-bg)]' : 'hover:bg-[var(--surface-2)]'}`}>
                                          <TypeIcon type={l.type} />
                                          <div className="min-w-0 flex-1"><div className="truncate font-semibold text-foreground">{l.title}</div><div className="text-[10px] text-muted-foreground">{l.type} · {l.duration} min</div></div>
                                          {l.hasCaption && <CheckCircle className="h-3 w-3 shrink-0 text-success-leaf" weight="fill" />}
                                        </button>
                                        <button onClick={() => handleDeleteLesson(l.id)} className="rounded p-1 text-destructive hover:bg-red-50"><Trash className="h-3 w-3" weight="duotone" /></button>
                                      </div>
                                    ))}
                                    <button onClick={handleAddLesson} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground hover:border-primary"><Plus className="h-4 w-4" weight="duotone" /> Add Lesson</button>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  {selectedLessonData && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2"><TypeIcon type={selectedLessonData.type} /><input value={selectedLessonData.title} onChange={e => handleLessonField(selectedLessonData.id, 'title', e.target.value)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary" /></div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <FormSelect label="Type" value={selectedLessonData.type} options={['video', 'text', 'pdf']} onChange={v => handleLessonField(selectedLessonData.id, 'type', v)} />
                                        <FormInput label="Duration (min)" value={String(selectedLessonData.duration)} onChange={v => handleLessonField(selectedLessonData.id, 'duration', Number(v))} />
                                        <FormInput label="URL" value={selectedLessonData.url} onChange={v => handleLessonField(selectedLessonData.id, 'url', v)} />
                                        <div className="flex items-center gap-4 pt-6">
                                          <label className="flex items-center gap-1.5 text-xs font-medium text-foreground"><input type="checkbox" checked={selectedLessonData.hasTranscript} onChange={e => handleLessonField(selectedLessonData.id, 'hasTranscript', e.target.checked)} className="accent-primary" /> Transcript</label>
                                          <label className="flex items-center gap-1.5 text-xs font-medium text-foreground"><input type="checkbox" checked={selectedLessonData.hasCaption} onChange={e => handleLessonField(selectedLessonData.id, 'hasCaption', e.target.checked)} className="accent-primary" /> Captions</label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {activeTab === 'quiz' && (
                              <div>
                                <div className="mb-4 flex items-center gap-4">
                                  <label className="text-xs font-semibold text-foreground">Pass threshold</label>
                                  <input type="range" min={0} max={100} value={editData.passThreshold} onChange={e => handleField('passThreshold', Number(e.target.value))} className="w-40 accent-primary" />
                                  <span className="text-sm font-bold text-primary">{editData.passThreshold}%</span>
                                </div>
                                <div className="space-y-3">
                                  {editData.quizQuestions.map((q, i) => (
                                    <div key={q.id} className="rounded-lg border border-border p-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
                                        <input value={q.text} onChange={e => { const qs = [...editData.quizQuestions]; qs[i] = { ...qs[i], text: e.target.value }; handleField('quizQuestions', qs) }} className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm text-foreground" />
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="rounded p-1 text-destructive hover:bg-red-50"><Trash className="h-3 w-3" weight="duotone" /></button>
                                      </div>
                                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {q.options.map((o, oi) => (
                                          <label key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${oi === q.correctIndex ? 'border-[var(--leaf)] bg-[var(--leaf-bg)]' : 'border-border'}`}>
                                            <input type="radio" name={`q-${q.id}`} checked={oi === q.correctIndex} onChange={() => { const qs = [...editData.quizQuestions]; qs[i] = { ...qs[i], correctIndex: oi }; handleField('quizQuestions', qs) }} className="sr-only" />
                                            <span className="w-4 text-muted-foreground">{String.fromCharCode(65 + oi)}.</span> {o}
                                            {oi === q.correctIndex && <CheckCircle className="ml-auto h-3.5 w-3.5 text-success-leaf" weight="fill" />}
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  <button onClick={handleAddQuestion} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><Plus className="h-4 w-4" weight="duotone" /> Add Question</button>
                                </div>
                              </div>
                            )}
                            {activeTab === 'certificate' && (
                              <div>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.certificateEnabled} onChange={e => handleField('certificateEnabled', e.target.checked)} className="accent-primary" /><span className="text-sm font-semibold text-foreground">Auto-generate certificate on quiz pass</span></label>
                                {editData.certificateEnabled && (
                                  <div className="mt-5 flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                    <div className="text-center">
                                      <Sparkle className="mx-auto h-8 w-8 text-primary" weight="duotone" />
                                      <p className="mt-2 text-xs font-semibold text-foreground">Certificate Template Preview</p>
                                      <p className="mt-1 text-[10px] text-muted-foreground">{editData.title} — Completed by [learner name] — [completion date]</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {activeTab === 'settings' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                          <div className="md:col-span-2"><FormInput label="Description" value={editData.description} onChange={v => handleField('description', v)} /></div>
                                <FormSelect label="Difficulty" value={editData.difficulty} options={['beginner', 'intermediate', 'advanced']} onChange={v => handleField('difficulty', v)} />
                                <FormSelect label="Status" value={editData.status} options={['draft', 'published']} onChange={v => handleField('status', v)} />
                                <FormInput label="Category" value={editData.category ?? ''} onChange={v => handleField('category', v)} />
                                <FormInput label="Badge Name" value={editData.badgeName ?? ''} onChange={v => handleField('badgeName', v)} />
                                <FormInput label="Badge Icon URL" value={editData.badgeIconUrl ?? ''} onChange={v => handleField('badgeIconUrl', v)} />
                                <FormInput label="Pass Threshold" value={String(editData.passThreshold ?? 70)} onChange={v => handleField('passThreshold', Number(v))} />
                                <FormInput label="Image URL" value={editData.imageUrl ?? ''} onChange={v => handleField('imageUrl', v)} />
                              </div>
                            )}
                            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                                {panelMode === 'create' ? 'Create Course' : 'Save Changes'}
                              </button>
                              {panelMode === 'edit' && (
                                <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                  <Trash className="h-4 w-4" weight="duotone" /> Delete
                                </button>
                              )}
                              <button onClick={() => { setSelectedId(null); setPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
                                <X className="h-4 w-4" weight="duotone" /> Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {panelMode === 'create' && editData && (
              <tr key="create-row"><td colSpan={7} className="border-b p-0">
                <div className="border-t border-border">
                  <div className="flex gap-1 border-b border-border bg-card px-5 pt-3">
                    {TABS.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>{t.label}</button>)}
                  </div>
                  <div className="bg-card px-6 py-5">
                    {activeTab === 'lessons' && (
                      <div className="flex flex-col gap-6 md:flex-row">
                        <div className="w-full shrink-0 md:w-64">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">Module Lessons</span>
                            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px]">0</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground p-2">No lessons yet. Save the course first, then add lessons.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'quiz' && (
                      <div><p className="text-xs text-muted-foreground">Save the course first, then add quiz questions.</p></div>
                    )}
                    {activeTab === 'certificate' && (
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.certificateEnabled} onChange={e => handleField('certificateEnabled', e.target.checked)} className="accent-primary" /><span className="text-sm font-semibold text-foreground">Auto-generate certificate on quiz pass</span></label>
                      </div>
                    )}
                    {activeTab === 'settings' && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                        <div className="md:col-span-2"><FormInput label="Description" value={editData.description} onChange={v => handleField('description', v)} /></div>
                        <FormSelect label="Difficulty" value={editData.difficulty} options={['beginner', 'intermediate', 'advanced']} onChange={v => handleField('difficulty', v)} />
                        <FormSelect label="Status" value={editData.status} options={['draft', 'published']} onChange={v => handleField('status', v)} />
                        <FormInput label="Category" value={editData.category ?? ''} onChange={v => handleField('category', v)} />
                        <FormInput label="Badge Name" value={editData.badgeName ?? ''} onChange={v => handleField('badgeName', v)} />
                        <FormInput label="Badge Icon URL" value={editData.badgeIconUrl ?? ''} onChange={v => handleField('badgeIconUrl', v)} />
                        <FormInput label="Pass Threshold" value={String(editData.passThreshold ?? 70)} onChange={v => handleField('passThreshold', Number(v))} />
                        <FormInput label="Image URL" value={editData.imageUrl ?? ''} onChange={v => handleField('imageUrl', v)} />
                      </div>
                    )}
                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        Create Course
                      </button>
                      <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
                        <X className="h-4 w-4" weight="duotone" /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
        <CursorPagination
          nextCursor={cursor}
          hasMore={hasMore}
          onNext={handleNext}
          onPrev={handlePrev}
          loading={loading}
        />
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Course"
        description={`Are you sure you want to delete "${selected?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
