#!/usr/bin/env bash
#
# Thin wrapper — prefer the Node hook (works on Windows without Git Bash/WSL).
# Kept so older docs / CURSOR_HOOK references to the .sh path still work.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec node "$ROOT/.cursor/hooks/post-turn-verify.mjs"
