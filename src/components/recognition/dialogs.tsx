/**
 * Recognition dialogs.
 *
 * Every destructive or second-approver action goes through one of these. They
 * share the shell dialog grammar but own the recognition evidence rules: typed
 * confirmations for the global switch, support references for corrections,
 * per-kind moderation decisions and a retry preview with blast radius.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Warning } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { cn } from "#/lib/utils.ts";
import {
  MODERATION_DECISIONS,
  MODERATION_KIND_LABEL,
  type FailureGroup,
} from "#/lib/recognition/logic";
import { formatNumber, formatXp } from "#/lib/recognition/format";
import type {
  Award,
  ModerationCase,
  ModerationDecision,
} from "#/lib/recognition/types";

export interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  variant?: "default" | "destructive";
  error?: string | null;
  onConfirm: () => void;
  size?: "sm" | "default" | "lg";
}

export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel = "Working…",
  pending = false,
  confirmDisabled = false,
  variant = "default",
  error,
  onConfirm,
  size = "default",
}: ActionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!pending ? onOpenChange(next) : undefined)}
    >
      <DialogContent
        className={
          size === "lg"
            ? "sm:max-w-2xl"
            : size === "sm"
              ? "sm:max-w-sm"
              : undefined
        }
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children ? <div className="space-y-4 py-4">{children}</div> : null}
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:text-red-300"
          >
            {error}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  danger?: boolean;
  minLength?: number;
  /** When set, the operator must type this word exactly. */
  requireTypedWord?: string;
  notice?: ReactNode;
  onConfirm: (reason: string) => void;
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  pending = false,
  error,
  danger = false,
  minLength = 10,
  requireTypedWord,
  notice,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setTyped("");
    }
  }, [open]);

  const valid =
    reason.trim().length >= minLength &&
    (!requireTypedWord || typed.trim() === requireTypedWord);

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      pending={pending}
      error={error}
      variant={danger ? "destructive" : "default"}
      confirmDisabled={!valid}
      onConfirm={() => onConfirm(reason.trim())}
    >
      {notice}
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reason
        </span>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="What happened, and why is this the right call?"
          aria-label="Reason"
        />
        <span
          className={cn(
            "text-xs",
            reason.length > 0 && reason.trim().length < minLength
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {reason.trim().length}/{minLength} characters minimum. The reason is
          written to the audit log.
        </span>
      </label>
      {requireTypedWord ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Type {requireTypedWord} to confirm
          </span>
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={requireTypedWord}
            aria-label={`Type ${requireTypedWord} to confirm`}
            autoComplete="off"
          />
        </label>
      ) : null}
    </ActionDialog>
  );
}

export interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  award: Award | null;
  pending?: boolean;
  error?: string | null;
  onSubmit: (input: {
    action: "credit" | "reversal";
    supportRef: string;
    note: string;
  }) => void;
}

export function CorrectionDialog({
  open,
  onOpenChange,
  award,
  pending,
  error,
  onSubmit,
}: CorrectionDialogProps) {
  const [action, setAction] = useState<"credit" | "reversal">("credit");
  const [supportRef, setSupportRef] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAction("credit");
      setSupportRef("");
      setNote("");
    }
  }, [open, award?.id]);

  const valid = supportRef.trim().length >= 10 && note.trim().length >= 10;

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        action === "reversal"
          ? "Reverse this award"
          : "Credit this award manually"
      }
      description={
        award ? (
          <>
            {award.reader} · {award.ruleKey} v{award.ruleVersion} ·{" "}
            {formatXp(award.xp)}. Manual credit is not a peer to Retry: it
            records evidence and creates an audited compensating entry.
          </>
        ) : undefined
      }
      confirmLabel={action === "reversal" ? "Record reversal" : "Record credit"}
      pending={pending}
      error={error}
      variant={action === "reversal" ? "destructive" : "default"}
      confirmDisabled={!valid}
      onConfirm={() =>
        onSubmit({ action, supportRef: supportRef.trim(), note: note.trim() })
      }
      size="lg"
    >
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Correction type"
      >
        {(["credit", "reversal"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={action === value}
            onClick={() => setAction(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              action === value
                ? value === "reversal"
                  ? "border-destructive bg-destructive/10 text-destructive dark:text-red-300"
                  : "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {value === "credit"
              ? "Credit (award stands)"
              : "Reverse (compensating entry)"}
          </button>
        ))}
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Support reference
        </span>
        <Input
          value={supportRef}
          onChange={(event) => setSupportRef(event.target.value)}
          placeholder="e.g. SUP-2026-1188"
          aria-label="Support reference"
        />
        <span className="text-xs text-muted-foreground">
          At least 10 characters. This is how support finds the reader’s case
          later.
        </span>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What was wrong
        </span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Explain the cause and the evidence you checked."
          aria-label="Correction note"
        />
      </label>
      {action === "reversal" ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive dark:text-red-300">
          Reversal adds a negative XP entry and keeps the original award on the
          ledger. No row is deleted.
        </p>
      ) : null}
    </ActionDialog>
  );
}

export interface ModerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ModerationCase | null;
  pending?: boolean;
  error?: string | null;
  onSubmit: (decision: ModerationDecision, reason: string) => void;
  canDisqualify?: boolean;
}

export function ModerationDialog({
  open,
  onOpenChange,
  entry,
  pending,
  error,
  onSubmit,
  canDisqualify = true,
}: ModerationDialogProps) {
  const [decision, setDecision] = useState<ModerationDecision>("dismiss");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setDecision("dismiss");
      setReason("");
    }
  }, [open, entry?.id]);

  const options = entry
    ? (MODERATION_DECISIONS[entry.kind] ?? []).filter(
        (option) =>
          canDisqualify ||
          (option.value !== "disqualify" && option.value !== "revoke"),
      )
    : [];
  const valid = reason.trim().length >= 10;

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Decide this case"
      description={
        entry
          ? `${MODERATION_KIND_LABEL[entry.kind] ?? entry.kind} · ${entry.subject}. Reporter identity stays private.`
          : undefined
      }
      confirmLabel="Record decision"
      pending={pending}
      error={error}
      variant={
        decision === "disqualify" || decision === "revoke"
          ? "destructive"
          : "default"
      }
      confirmDisabled={!valid}
      onConfirm={() => onSubmit(decision, reason.trim())}
      size="lg"
    >
      {entry ? (
        <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Reason reported
            </p>
            <p className="mt-1">{entry.reason}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Evidence
            </p>
            <p className="mt-1">{entry.evidence}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Reporter
            </p>
            <p className="mt-1">{entry.reporter}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Notification
            </p>
            <p className="mt-1">
              The affected reader is told the outcome, never the reporter.
            </p>
          </div>
        </div>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Decision
        </span>
        <select
          value={decision}
          onChange={(event) =>
            setDecision(event.target.value as ModerationDecision)
          }
          aria-label="Decision"
          className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reason
        </span>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="What did you check, and why is this the right outcome?"
          aria-label="Decision reason"
        />
        <span className="text-xs text-muted-foreground">
          At least 10 characters. Disqualification is appealable and audited.
        </span>
      </label>
    </ActionDialog>
  );
}

export interface RetryPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: FailureGroup[];
  onConfirm: (ids: string[]) => void;
}

export function RetryPreviewDialog({
  open,
  onOpenChange,
  groups,
  onConfirm,
}: RetryPreviewDialogProps) {
  const ids = groups.flatMap((group) => group.awards.map((award) => award.id));
  const xp = groups.reduce((sum, group) => sum + group.xp, 0);
  const versions = [...new Set(groups.flatMap((group) => group.ruleVersions))];
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Retry ${ids.length} failed award${ids.length === 1 ? "" : "s"}?`}
      description={`${formatNumber(xp)} XP across ${versions.length} rule version${versions.length === 1 ? "" : "s"}. Retrying is idempotent by award key, but it is still a write with blast radius.`}
      confirmLabel="Retry these awards"
      onConfirm={() => onConfirm(ids)}
      size="lg"
    >
      <div className="space-y-2">
        {groups.map((group) => (
          <div
            key={group.cause}
            className="rounded-md border border-border p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                {group.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.count} award{group.count === 1 ? "" : "s"} ·{" "}
                {formatXp(group.xp)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {group.explanation}
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {group.ruleVersions.join(" · ")}
            </p>
          </div>
        ))}
        {ids.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing failed in this scope.
          </p>
        ) : null}
      </div>
      <div className="flex items-start gap-2 rounded-md border border-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2 text-xs text-[var(--amber-deep)]">
        <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="duotone" />
        <span>
          Bulk retry does not change XP, rule versions or reader identity. It
          only re-drives delivery.
        </span>
      </div>
    </ActionDialog>
  );
}
