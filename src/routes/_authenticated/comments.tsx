import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import { Trash } from '@phosphor-icons/react'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { CommentsSkeleton } from '#/components/skeletons/comments-skeleton'
import type { CommentItem } from '#/lib/api/comments'

export const Route = createFileRoute('/_authenticated/comments')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'comments', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: CommentsPage,
})

function CommentsPage() {
  const api = useApi()
  const [comments, setComments] = useState<CommentItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.comments.moderationList({ limit: 50 })
      setComments(res.items)
      setHasMore(res.hasMore)
    } catch {
      toast.error('Failed to load comments')
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { loadAll() }, [loadAll])

  const visible = filter
    ? (comments ?? []).filter(c => c.status === filter)
    : (comments ?? [])

  const handleRemove = useCallback(async (commentId: string) => {
    setDeleting(true)
    try {
      await api.comments.moderate(commentId, 'delete', 'Removed by moderator')
      toast.success('Comment removed')
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {
      toast.error('Failed to remove comment')
    } finally {
      setDeleting(false)
      setShowDelete(null)
    }
  }, [api])

  if (loading) return <CommentsSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-bold text-foreground">Comments</h1>
      </div>

      <div className="flex items-center gap-2">
        {[null, 'published', 'deleted'].map((s) => (
          <button
            key={s ?? 'all'}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              filter === s
                ? 'bg-primary text-white shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {s ?? 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.authorName}</span>
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm leading-relaxed line-clamp-2 text-foreground">{c.body}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Story: {c.storyCaption || 'N/A'}</span>
                  <span>·</span>
                  <span>{c.likeCount} likes</span>
                </div>
              </div>
              <button
                onClick={() => setShowDelete(c.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No comments found</p>
        )}
      </div>

      <ConfirmDialog
        open={showDelete !== null}
        onOpenChange={() => setShowDelete(null)}
        title="Remove Comment"
        description="This will soft-delete the comment. The thread structure is preserved with a '[deleted]' stub."
        onConfirm={() => showDelete && handleRemove(showDelete)}
        loading={deleting}
      />
    </div>
  )
}
