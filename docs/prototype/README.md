# Audio Stories — Admin Prototype

Status: **interactive prototype, 33/40, awaiting user approval.**
Ticket: [#264](https://github.com/bradleygichuru/ytci-mobile/issues/264) · Map: [#253](https://github.com/bradleygichuru/ytci-mobile/issues/253) · Spec: [#262](https://github.com/bradleygichuru/ytci-mobile/issues/262)
Branch: `prototype/audio-stories-admin` · Throwaway design artifact, not production implementation.

## Files

- `audio-stories-admin.html` — the prototype shell and screens.
- `audio-stories-admin.css` — layout and the existing YTC Explorer Command tokens.
- `audio-stories-admin.js` — role/scenario/screen state, dialogs, upload, review, and stubs.
- Uses the existing admin design system: Plus Jakarta Sans, forest `#154212`, amber `#fdc002`, leaf `#345a00`, 8px cards, pill controls, status badges.

## How to view

Open `audio-stories-admin.html` in a browser, or serve the folder:

```bash
cd docs/prototype
python3 -m http.server 8092
```

Then open `http://127.0.0.1:8092/audio-stories-admin.html`.

The bar above the app frame is prototype chrome. Use it to switch:

- **Role:** administrator, content editor, super admin, moderator (read-only).
- **Scenario:** default, empty, loading, load error, edit conflict, upload failed, sensitive review, restricted review, scheduled publish.
- **Screen:** Stories, story editor, Collections, collection editor, Review queue, review detail.

Deep links:

```text
?screen=editor
?screen=editor&role=content_editor
?screen=editor&role=moderator
?screen=review-detail&scenario=sensitive
?screen=review-detail&scenario=restricted
?screen=editor&scenario=upload-failed
?screen=editor&preview=1
?screen=editor&tab=tracks
```

## What it covers

- **Stories:** status, revision state, languages, risk tier, reviewer, readiness, search and filters, empty/loading/error states.
- **Story editor:** Story, Tracks & transcripts, Credits & placement, Rights & review, Publish, and a persistent readiness rail.
- **Tracks:** per-language audio, file metadata, replacement upload with progress/retry/error, narrator consent, transcript paragraphs with cues and word counts.
- **Rights & review:** rights basis, evidence references, risk tier, assignment, review record, audit timeline.
- **Review queue:** unassigned/mine/sensitive/restricted filters, assignment, frozen revision, live diff, checklist, approve/request changes/reject, second reviewer for sensitive content, restricted escalation.
- **Preview:** authenticated, watermarked story detail with a phone frame; no public share link.
- **Publish:** readiness gate, publish now, schedule, unpublish, archive/revoke by role, collection cascade warning.
- **Collections:** list, editor, ordered stories, featured toggle, publish/unpublish/archive, cascade warning.
- **Role gating:** content editor can draft/submit but not review/publish; moderator is read-only; administrators publish; super-admins archive/revoke; sensitive content needs a second reviewer.
- **States:** empty, loading, error, conflict, upload failure, sensitive, restricted, scheduled.
- **Accessibility:** labels, focus trap for dialogs, Escape, tab roving/arrow keys, status text alongside colour, 44px-ish controls, 12px functional-text floor.

## Critique

| Round | Score | Detector | Notes |
|---|---:|---:|---|
| 1 | **33/40** | 26 findings | 23 non-attributable `nested-cards`; 3 false positives (`overused-font`, `dark-glow`, `aphoristic-cadence`). Snapshot: `.impeccable/critique/2026-11-16T16-54-31Z__docs-prototype-audio-stories-admin-html.md`. |

## Fidelity

- The prototype uses fictional sample stories and admin names. Production content must be real, rights-cleared, and reviewed.
- The Story editor is wired for The Last Mangrove; other rows update the header and open the same representative editor. The collection editor is wired for Coastal Voices. The review detail is wired for The Last Mangrove; the scenario selector demonstrates sensitive and restricted states.
- Upload progress, review decisions, scheduling, and publish transitions are simulated. No API calls are made.
- The prototype deliberately models the **staged revision** workflow: the live revision stays public while a replacement is reviewed.

## Next

1. ~~Run `impeccable critique` and iterate to **≥ 30/40**.~~ Done: **33/40**.
2. User approves; link the prototype, deep links, screenshots, and critique on #264.
3. Implementation follows the admin workflow spec; #262 is closed.
