import { useBlocker } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'

/** Blocks navigation (and reload) while a staged definition has unsaved edits. */
export function DirtyGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: dirty,
    disabled: !dirty,
    withResolver: true,
  })

  if (blocker.status !== 'blocked') return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) blocker.reset?.() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved rule changes</DialogTitle>
          <DialogDescription>The staged definition has edits that have not been saved or published.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Save the draft before leaving, or leave without saving. The live version is untouched either way.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => blocker.reset?.()}>Stay on this page</Button>
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>Leave without saving</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
