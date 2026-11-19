# Admin execution shell

Status: landed by [ytci-mobile#360](https://github.com/bradleygichuru/ytci-mobile/issues/360)
Owner: `stream:platform`
Contracts: frozen 1.0.0 in `ytci-go`

The admin shell is the shared frame the execution streams (#361–#375) build
into. It ships sectioned navigation, table/dialog/filter/toast/switch primitives,
data states, role-aware gating and a typed contracts client — **not** feature
screens. New surfaces are flagged off by default and render a placeholder route.

## What this ticket owns

| File | Purpose | Change rule |
|---|---|---|
| `openapi/contracts.v1.yaml` | Vendored frozen OpenAPI 1.0.0 | Regenerate from `ytci-go`; never hand-edit |
| `openapi/roles.v1.yaml` | Vendored canonical role/permission contract | Same |
| `src/lib/contracts/generated/contracts.ts` | Generated API types | `bun run generate:contracts` |
| `src/lib/contracts/roles.generated.ts` | Generated role model | `bun run generate:roles` |
| `src/lib/contracts/client.ts` | `openapi-fetch` wrapper: base URL, envelope, fixture state, stale marker | Platform only |
| `src/lib/contracts/roles.ts` | Permission helpers over the generated model | Platform only |
| `src/lib/contracts/session.ts` | Session → canonical role, `useContractRole` | Platform only |
| `src/lib/flags.ts` | Surface flags, all default `false` | Platform only |
| `src/lib/navigation/sections.ts` | **Nav registry** — append-only for feature streams | Platform reviews additions |
| `src/lib/toast.ts` | `notify.*` over sonner + envelope-aware error copy | Platform only |
| `src/components/shell/*` | `PageHeader`, `DataState`, `DataTable`, `FilterBar`, `FormDialog`, `Gates` | Platform only |
| `src/components/ui/*` | shadcn primitives (table, dialog, switch, sonner) | Regenerate via shadcn, no forks |
| `src/routes/_authenticated/programme/*` | Placeholder routes for shell surfaces | Platform only |
| `vitest.shell.config.ts`, `smoke/*` | Live shell smoke against the mock | Platform only |

Existing feature routes (`/events`, `/analytics`, `/destinations`, …) remain
owned by their streams.

## Adding a feature screen without editing shared nav

1. Add your route under `src/routes/_authenticated/` in your own folder.
2. Append one entry to the relevant section in `src/lib/navigation/sections.ts`
   (or flip an existing `status: "shell"` entry to `"live"` and point `path` at
   your route):

   ```ts
   {
     key: "recognition",
     label: "Recognition",
     path: "/programme/recognition",
     icon: Sparkle,
     permission: "recognition.read",
     requiresAdmin: true,   // `.read` is reader-scope; admin needs admin_access too
     flag: "recognition",
     status: "shell",
     owner: "stream:recognition",
   }
   ```

3. Build the screen from the shared primitives:

   ```tsx
   <PageHeader title="Recognition" actions={<Can permission="recognition.publish_rule"><Button>Publish</Button></Can>} />
   <FilterBar searchValue={q} onSearchChange={setQ} onReset={reset} isFiltered={isFiltered}>
     <Select … />
   </FilterBar>
   <DataTable columns={columns} data={rows} isLoading={isLoading} onRetry={refetch} />
   <FormDialog open={open} onOpenChange={setOpen} title="Publish rule" onSubmit={save}
               fieldErrors={errors} error={error ? errorMessage(error) : null} pending={saving}>
     …
   </FormDialog>
   ```

4. Set `VITE_FLAG_<SURFACE>=true` to launch. Never edit the sidebar, `_authenticated`
   layout, `src/lib/contracts/*` or `src/components/shell/*` from a stream.

## Feature flags

Resolution order: dev override (`localStorage["ytci.flags"]`) → build env → default `false`.

| Surface | Env flag |
|---|---|
| MICE events | `VITE_FLAG_MICE` |
| Recognition | `VITE_FLAG_RECOGNITION` |
| Species | `VITE_FLAG_SPECIES` |
| Analytics | `VITE_FLAG_ANALYTICS` |

`setFlagOverride("recognition", true)` flips a surface in dev only.

## Contracts client and mock

```bash
# ytci-go checkout with cmd/contracts-mock (#359)
cd ../ytci-go && go run ./cmd/contracts-mock -addr :8099
# or
YTCI_GO_DIR=../ytci-go bun run dev:mock

bun run dev
```

`contractsBaseUrl()` prefers `VITE_CONTRACTS_API_URL` (deployed BFF), then the
mock under `import.meta.env.DEV`, then a same-origin relative base for the
deployed proxy. `createContractsClient({ fixtureState })` selects
`default|empty|error|stale`; `error` returns **503** with the frozen envelope,
`stale` returns **200** plus `X-Data-Stale: true`.

Fixture data is served by the mock. Nothing is hardcoded in product code.

## Roles and gating

`openapi/roles.v1.yaml` is the source of truth; the sidebar, routes and actions
all read the generated model.

- `useContractRole()` → `{ role, can, canAny, permissions, canAccessAdmin }`.
- `<Can permission="species.publish">` hides an action the role cannot perform.
- `<SurfaceGate flag="species" permission="species.read" owner="stream:species">`
  guards route content.
- Nav items combine three gates: flag, canonical permission, and (for items that
  predate the contract) the legacy RBAC resource. Admin surfaces also set
  `requiresAdmin`, because `*.read` is granted to reader roles.
- Hiding is a courtesy: the Go API enforces every write.

Legacy `src/lib/rbac.ts` still governs pre-contract screens. New surfaces use
contract permissions only; do not add resources to the legacy map.

## Tests

```bash
bun run typecheck                 # no new errors from this ticket (baseline known-red)
bun run test:shell                # unit: flags, roles, nav, client, data states, toast
bun run test:shell:smoke          # boots cmd/contracts-mock and exercises the client
bun run generate:contracts:check  # fails if generated clients drift
```

The smoke config starts `cmd/contracts-mock` from `YTCI_GO_DIR` (default
`../ytci-go`) and is separate from `bun run test:unit`. Playwright is not run by
this ticket and must not be pointed at another session's server.

## Change control

1. **Additive** changes: platform review + contract version bump + fixture +
   test; update the vendored YAML, regenerate, commit both generated files.
2. **Breaking** changes: change-control ticket in `ytci-mobile` and the matching
   contract PR in `ytci-go` before client code.
3. **Shell edits** are platform-owned. Feature streams request changes; they do
   not fork `sections.ts`, `components/shell/*` or the contracts client.
4. **Legacy RBAC** is frozen for existing screens; new surfaces use the contract
   role model only.
