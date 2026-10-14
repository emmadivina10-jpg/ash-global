#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Native Vite tooling needs real Node, not Bun's Node compatibility mode.
command -v node >/dev/null
command -v bun >/dev/null

# Installs only the committed dependency graph and runs the entities shim.
# Shared database migrations and external-service changes require approval.
bun install --frozen-lockfile
