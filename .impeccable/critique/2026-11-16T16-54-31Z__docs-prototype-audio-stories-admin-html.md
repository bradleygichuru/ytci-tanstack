---
target_identity: "file:/tmp/opencode/ytci-admin-audio-stories-prototype/docs/prototype/audio-stories-admin.html"
target_fingerprint: "sha256:5c741a8b719f1ef92e97ef8edcbd4f9b39983b3d2108c03ff5b4594e55e37c41"
target_path: /tmp/opencode/ytci-admin-audio-stories-prototype/docs/prototype/audio-stories-admin.html
timestamp: 2026-11-16T16-54-31Z
slug: docs-prototype-audio-stories-admin-html
---
# Critique — Audio Stories admin prototype

Target: `/tmp/opencode/ytci-admin-audio-stories-prototype/docs/prototype/audio-stories-admin.html`
Ticket: #264 · Map: #253 · Spec: #262 · ADR 0003
Date: 2026-11-16
Round: 2 (after P0/P1 fixes)

Score: **33/40** (previous: 27/40)
Detector: **26 findings** — 23 non-attributable `nested-cards` from the app shell/card surfaces, plus `overused-font` (the mandated Plus Jakarta Sans) and one `dark-glow` from the app frame shadow. No text-size or contrast findings.
Interaction suite: role/scenario/screen switching, freeze/return, preview, decisions, scheduling, empty/upload/sensitive/restricted states pass in jsdom.

## Design specificity

High. The live-vs-revision model from ADR 0003 is structural: the list separates Status from Revision, the editor freezes material content while keeping story metadata saveable, Return to draft is reason-bearing, the review detail shows the frozen snapshot with the changed transcript paragraph and credits, and sensitive/restricted revisions show 6/7 with a warning row. Rights basis, consent references, county/theme, EAT, reviewer separation, collection cascade, and the draft-preview watermark are domain-shaped, not generic CMS labels. The remaining generic surface is the stat strip and explainer cards; the model beneath them is authored.

## Heuristics

| # | Heuristic | Score | Basis |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Live/revision, readiness, queue counts, dirty-state label, Published at, Decision recorded; after Return to draft the rail still says assigned/in queue. |
| 2 | Match between system and real world | 4 | Revision/freeze/return, rights/consent, county/theme, EAT, credits, place scope, collection cascade. |
| 3 | User control and freedom | 3 | Reason-bearing return/cancel, conflict Reload/Copy, preview close/focus restore, filters; no dirty-navigation guard or discard. |
| 4 | Consistency and standards | 3 | Decisions confined to review detail and current identity matches assignment; Reassign does not update the card, notes stay editable after decision. |
| 5 | Error prevention | 3 | Sensitive 6/7 and restricted block approval; destructive actions require reasons; one-way decisions; schedule accepts past times. |
| 6 | Recognition rather than recall | 4 | Full five-paragraph transcript with cues and highlighted change, credits, place scope, before/after diff. |
| 7 | Flexibility and efficiency | 3 | Tabs, filters, deep links, role/scenario controls, keyboard tabs; no saved views or assign-other in queue. |
| 8 | Aesthetic and minimalist design | 4 | Cohesive forest/amber/leaf system, clear hierarchy, dense but appropriate admin layout. |
| 9 | Error recovery | 3 | Load/upload/conflict/empty recovery, permission banners, restricted escalation; no review-conflict or unsaved-changes recovery. |
| 10 | Help and documentation | 3 | Inline review/collection help, API-computed readiness, role banners; field-level help thin. |
|  | **Total** | **33/40** | |

## Strengths

1. **The revision model is visible.** Status + Revision columns, a frozen editor, live-vs-revision diff, Return to draft, and atomic publish copy all reinforce the same mental model.
2. **The review detail is a real decision surface.** Frozen snapshot, transcript evidence, credits/place scope, reviewer separation, sensitive second reviewer, restricted block, and one-way decision record.
3. **State and error copy is authored.** “Your saved drafts are safe”, “The connection dropped at 62%”, “This story changed while you were editing”, the draft watermark, and the cascade warnings make the workflow feel operational.

## Remaining issue

**P2 — Reassignment and decision notes are not fully closed.**
Reassigning shows only a toast; the assignment card still says “D. Otieno (you)” and decisions stay available. After a decision, the review notes textarea remains editable and the recorded panel omits the submitted note/reason.
Fix: update the assignment card and recompute decision availability on reassign; disable the notes field after a decision and include the note/reason in the read-only decision record. Also change the readiness blocking copy after Return to draft.

## Evidence

Screenshots: `/tmp/opencode/audio-stories-shots/pass-*.png` and `final-*.png` (stories, editor, content editor, moderator, collections, collection editor, review queue/detail, sensitive, restricted, upload failure, empty, preview, scheduled).
Detector: 26 findings, no actionable text/contrast failures.
Tests: jsdom role/scenario checks pass; freeze/return, preview, role gating, approval, schedule, and sensitive/restricted states verified.
