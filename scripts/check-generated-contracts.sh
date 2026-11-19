#!/usr/bin/env bash
# Fails when the committed generated clients drift from the frozen contracts.
#
# Run after editing openapi/*.yaml. CI runs this in the shell job; the generated
# TypeScript is a build artifact and must never be hand-edited.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
root="$PWD"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

bunx openapi-typescript openapi/contracts.v1.yaml -o "$tmp/contracts.ts" >/dev/null
node scripts/generate-roles.mjs --out "$tmp/roles.generated.ts" >/dev/null

status=0
for pair in "contracts.ts:src/lib/contracts/generated/contracts.ts" "roles.generated.ts:src/lib/contracts/roles.generated.ts"; do
  generated="${pair%%:*}"
  committed="${pair##*:}"
  if ! diff -q "$tmp/$generated" "$root/$committed" >/dev/null 2>&1; then
    echo "stale: $committed" >&2
    diff -u "$committed" "$tmp/$generated" | head -40 >&2 || true
    status=1
  fi
done

if [[ $status -ne 0 ]]; then
  echo "" >&2
  echo "Run 'bun run generate:contracts' and commit the output." >&2
  exit 1
fi

echo "generated contracts are current"
