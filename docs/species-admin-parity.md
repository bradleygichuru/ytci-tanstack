# Species admin — prototype parity and implementation notes

Ticket: [ytci-mobile#371](https://github.com/bradleygichuru/ytci-mobile/issues/371)
Branch: `feat/species-admin`
Prototype: [`docs/prototypes/species-admin.html`](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-admin-scanner/docs/prototypes/species-admin.html)
Critique: [`species-scanner-critique.md`](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-admin-scanner/docs/prototypes/species-scanner-critique.md) (27/40, every P1 is a gate)
Checklist: [`parity-checklist.md`](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-admin-scanner/docs/prototypes/parity-checklist.md) — species/translation admin

## Screens

| # | Prototype screen | Implementation route | Status |
|---|---|---|---|
| 1 | `species-overview` | `/programme/species` | Built |
| 2 | `species-catalogue` | `/programme/species/catalogue` | Built |
| 3 | `species-editor` | `/programme/species/$speciesId` | Built |
| 4 | `species-languages` | `/programme/species/$speciesId/languages` | Built |
| 5 | `species-translation` | `/programme/species/translation` | Built |
| 6 | `species-sources` | `/programme/species/sources` | Built |
| 7 | `species-readiness` | `/programme/species/readiness?species=<slug>` | Built |
| 8 | `species-audit` | `/programme/species/audit` | Built |

The nav entry keeps its canonical path (`/programme/species`). Its registry status
flipped from `shell` to `live`; no shared shell component was edited.

## Carry-forwards from the critique

| # | Gate | Implementation evidence |
|---|---|---|
| 1 | Audio and media are records | `SpeciesAudio` panels in the language screen and the queue carry speaker, consent reference, duration, playback, transcript and review state. Saving writes `POST /v1/admin/species/{id}/audio`. |
| 2 | Every readiness blocker links to its record and variant | `deriveReadiness()` returns `{ record, link, consequence }` per check. The screen renders the record id and a route link to the exact variant/task/source. |
| 3 | Stale is derived, not declared | `deriveVariantStale()` compares the pinned source version with the effective base revision, reads the API stale flag, and applies a local base edit to every prose variant. Saving a draft never clears it; only a review does. Publish blocks while any variant is stale. |
| 4 | Rights actions name their blast radius and refuse non-revocable sources | `isRevocableSource()` rejects taxonomy-only, link-out and CC0/public-domain sources. `computeSourceImpact()` lists affected species and rights; the withdrawal dialog requires a same-use replacement in the same act. |
| 5 | Per-variant contributor/region/source | The language table shows contributor, reviewer, region and source per row; reviewer/contributor separation is checked in `reviewVariant`, `reviewName`, `reviewAudio` and `decideReview`. |
| 6 | Volume operations and evidence records | Catalogue fetches through the cursor (100/page, capped at 20 pages), supports sorting, 25-row pagination, search, language/taxonomy/IUCN/publication filters, selection, bulk assignment and bulk review submission. Where-to-see renders structured evidence records with source and confidence. |
| 7 | Lose no work | `useDirtyGuard` blocks router navigation and unload while the editor is dirty; a retained base draft is restored from the browser overlay and the editor offers “Restore live values”. |

## Deliberate deviations

1. **Class filter → taxonomy/IUCN filters.** The frozen `SpeciesSummary` has no
   taxonomic class, rank or created/updated timestamp. A class control would be a
   dead filter. The catalogue exposes the taxonomic status and IUCN category that
   the contract actually returns, and the gap is called out on-screen.
2. **Common name is not on the base form.** The prototype edits a common name next
   to the scientific name while claiming a language-neutral base. The base form
   keeps taxonomy/conservation only; English and local names live on the language
   screen. This makes the language-neutral claim true.
3. **Where-to-see is read-only.** The contract has no evidence-record write
   endpoint, so the editor renders the structured records rather than the
   prototype's free-text input. The gap is shown in the screen.
4. **Jungle/class/habitat header fields.** Habitat and range are English-variant
   prose, not base fields, matching `SpeciesVariant`. The editor shows them with
   an “Edit English prose” link.

## Roles

| Role | Overview / catalogue / languages / queue | Sources & rights | Readiness / publish |
|---|---|---|---|
| `content_editor` | Read; create/edit base; bulk review submission | Read | Read |
| `species_expert` | Read; edit base | Read | Read |
| `translator` | Read; save name/prose/audio drafts and submit | Permission-required panel | Read; no publish/second review |
| `language_reviewer` | Read; approve/stale-clear | Permission-required panel unless it also holds rights duty | Second review + request changes |
| `rights_reviewer` | Read | Read + withdraw rights/source | Read |
| `moderator` | Read-only | Read-only | Read-only |
| `administrator` / `super_admin` | Full | Full | Publish (server gate still authoritative) |

Actions render through `<Can permission="…">`; the Go API remains the enforcement
point. The layout gate accepts a species write duty as well as
`platform.admin_access` so the people this surface exists for are not locked out
(see shell changes below).

## Data states

The layout has a data-state selector: `default`, `empty`, `error`, `stale`.
`empty`/`error` render the shared `DataStateView` with recovery; `stale` shows the
stale banner and disables writes while filters and exports keep reading the last
values. Reads pass `?state=` through the shared contracts client; route loaders
prefetch the default catalogue, review queue, sources and rights so the first
paint is populated.

## Contract gaps (no contract changes made)

- No species audit endpoint. The audit screen combines the records that carry
  timestamps (review decisions, sources, rights) with browser-session decisions,
  marked as such. Filters and CSV export are client-side.
- No rights/source withdrawal endpoint. The computed blast radius, replacement
  selection and audit entry are local; publish is blocked locally for affected
  species.
- No review-assignment or submit-translation endpoint. Assignment, submission and
  local stale clearing are recorded in the audit overlay; review decisions,
  publish and rights remain server-owned.
- `SpeciesSummary` has no taxonomic class, `updatedAt`, or per-variant state;
  `SpeciesDetail` returns only the requested language's prose. See deviations.
- `AdminListSpecies` supports only `state` + cursor/limit; search and filters are
  applied client-side to the cursor-loaded set.
- Mock fixture matching in `ytci-go` (species branch) resolves the static
  `/v1/admin/species/{review,sources,rights}` GETs to `/{id}` when the detail
  route appears earlier. The UI reads the correct fixtures when the static routes
  are matched first; the mock ordering needs a fix in the API stream.

## Shell changes needed (platform-owned)

1. `platform.admin_access` is granted only to `moderator`, `administrator` and
   `super_admin`. `content_editor`, `species_expert`, `translator`,
   `language_reviewer` and `rights_reviewer` are `admin-write` roles but cannot
   see the sidebar entry because `requiresAdmin` reads that permission. Grant
   `platform.admin_access` to the admin-write roles in `roles.v1.yaml`, or give
   `requiresAdmin` a scope-aware predicate.
2. A shared species-audit and rights-withdrawal contract would let the local
   overlay become a cache instead of the source of truth.
3. The `SpeciesSummary` additions listed above would remove the documented
   catalogue deviation.

## Verification

- `bun run typecheck` — no new errors (baseline errors remain in e2e/scripts/db,
  flagged by the shell ticket).
- `bunx vitest run src/lib/species src/components/species src/lib/navigation src/components/shell`
  — model (20), shared components (7), nav/shell suites pass.
- SSR smoke against `cmd/contracts-mock` with an authenticated session: overview,
  catalogue, editor, languages, translation, sources, readiness and audit all
  return 200 and render their data-state or content.
- No Playwright device run in this ticket, per the execution instruction.
  The prototype's screenshot matrix (phone/tablet/dark/large text) and the
  independent re-critique (≥30/40) remain for the verification ticket; this
  document records the parity matrix in the meantime.
