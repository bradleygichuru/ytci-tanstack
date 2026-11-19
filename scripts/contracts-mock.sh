#!/usr/bin/env bash
# Starts the frozen contracts mock server for the mobile shell.
#
# The spec lives in ytci-go (ticket #359). Set YTCI_GO_DIR if the checkout is not
# a sibling of this repo:
#
#   bun run dev:mock
#   YTCI_GO_DIR=~/code/ytci-go bun run dev:mock
set -euo pipefail

ADDR="${CONTRACTS_MOCK_ADDR:-:8099}"
YTCI_GO_DIR="${YTCI_GO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/ytci-go}"

if [[ ! -d "$YTCI_GO_DIR" ]]; then
  echo "ytci-go not found at $YTCI_GO_DIR" >&2
  echo "Set YTCI_GO_DIR to the ytci-go checkout that contains cmd/contracts-mock." >&2
  exit 1
fi

cd "$YTCI_GO_DIR"
echo "contracts mock → http://localhost${ADDR} (health: /health, routes: /__fixtures)"
exec go run ./cmd/contracts-mock -addr "$ADDR"
