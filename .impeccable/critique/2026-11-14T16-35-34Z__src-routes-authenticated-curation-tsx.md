---
target: src/routes/_authenticated/curation.tsx
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/tmp/opencode/ytci-tanstack-curation/src/routes/_authenticated/curation.tsx"
target_fingerprint: "sha256:1aa8628087320ba15547a814f956c66c6758fec5477f6303bea8cbf28f092703"
target_path: /tmp/opencode/ytci-tanstack-curation/src/routes/_authenticated/curation.tsx
timestamp: 2026-11-14T16-35-34Z
slug: src-routes-authenticated-curation-tsx
---
Method: dual-agent (A: design review · B: detector returned no findings)

# Catalog curation admin surface critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Save/publish feedback is coherent; load failures still render as empty, with no retry. |
| 2 | Match between system and real world | 3 | Traveler preview and media split make the artifact concrete; "composer", "rows", and "fixtures" remain undefined. |
| 3 | User control and freedom | 3 | Dirty guard and drill-through are in; published is terminal and there is no undo for reject. |
| 4 | Consistency and standards | 3 | One status control, "Review" header, media section, one date format; a few status labels and rating/count labels remain inconsistent. |
| 5 | Error prevention | 3 | Request token + ID gate close the wrong-place publish path; the 40-character gate is still shallow and publish is terminal. |
| 6 | Recognition rather than recall | 3 | Preview, dirty badge, focus move; the checklist does not link to failing fields. |
| 7 | Flexibility and efficiency | 2 | Auto-advance preserves filters but is not fully sequential across pages; no sort, assignment, bulk, keyboard, or URL state. |
| 8 | Aesthetic and minimalist design | 3 | Full-width queue and media split are good; the selected row tint is faint. |
| 9 | Error recovery | 2 | Load errors masquerade as empty; failed candidate loads have no retry. |
| 10 | Help and documentation | 2 | Inline policy and coverage definitions are strong; no glossary or first-run path. |
| **Total** | | **27/40** | **Pass (≥27) by the minimum margin** |

## Design specificity verdict

The data model is unmistakably YTCI: 47 Kenyan counties with codes, golden fixtures from Amboseli to Fort Jesus, fee verification with a named basis, 4x4 and boat transport, dry/green/migration seasons, and a monthly owner review. The coverage fixture table and the publish guard are real domain artifacts.

The interaction shell is still a generic admin CRUD surface: title, tabs, filter bar, table, right-hand form, toast. The traveler preview, composer-ready checklist, and coverage drill-through now make the verification act visible, but the page still does not show a faithful mobile card or map pin, and "composer" is undefined. It reads as a competent internal tool wearing YTCI vocabulary, not yet as the program's editorial instrument.

## What's working

1. **The safety gate is layered.** Request-token/ID matching prevents wrong-place writes; Publish unlocks only when the checklist passes; the server and DB reject an unverified publish; rejection needs a reason and names the place.
2. **The workflow now has throughput.** Full-width queue until selection, focus move, Save & next, filter-aware auto-advance, dirty guard, and a traveler preview. A curator can move through the month's queue without a spreadsheet.
3. **Coverage is a real artifact.** County units, sorted gaps, generated timestamp, drill-through Review actions, golden-fixture readiness, and CSV/JSON export answer "where are the gaps?" quickly.

## Priority issues

**[P2] Auto-advance is filter-aware but not fully sequential across pages.**
**Why it matters:** "Next" can still surprise a curator at page boundaries.
**Fix:** Capture the current index before saving; open the row that shifts into the slot, or the next page when the slot is the last item.

**[P2] Load failures still look like empty results.**
**Why it matters:** A failed queue, coverage, or candidate request can read as "no work" instead of "retry".
**Fix:** Track explicit error state and render an inline Retry for each surface; only show empty copy after a successful response.

**[P2] Readiness is a length check, not editorial judgment.**
**Why it matters:** A generic 40-character sentence can earn "composer ready", and the lead cannot scan for thin copy.
**Fix:** Raise the description target toward 80–120 characters, add a "thin description" queue/coverage signal, and label the state "Ready (no image)" when the image exception applies.

**[P2] Coverage's default sort buries the workable rows.**
**Why it matters:** 35 not-covered rows with disabled Review precede the 12 limited counties that have pending candidates.
**Fix:** Make the "Limited" card filter the table or split "Workable now" from "Needs source data".

**[P3] Polish:** panel/fixture status labels, "Reviews" as rating/count, global chip counts under filters, faint selected-row tint, 23 chip tab stops, missing `aria-controls`/`tabpanel`, no unpublish path, and "composer" still undefined.

## Personas

**Alex (power curator):** Can now move quickly, but page-boundary advance and the lack of sort/assignment/bulk still push him toward a spreadsheet.
**Jordan (first-time county officer):** The preview and checklist give him a shape, but "composer ready", "fixtures", and "candidate" are still unexplained; blocked checks that need import data offer no escalation.
**Wanjiku (content lead):** Coverage and fixture health are readable and exportable; assignment, thin-copy detection, and a correction path are still missing.

## Questions to consider

1. If "composer ready" can be earned by 40 characters, what editorial judgment is the tool actually enforcing?
2. When a wrong fee goes live on a Friday, who fixes it — and why is published still terminal?
3. What would clearing 70 items feel like if "next" were always the row under the cursor?
4. Coverage says 0/47 counties and 10/10 golden fixtures; which number belongs in the monthly report?
5. What would a faithful mobile-card preview change about what curators publish?
