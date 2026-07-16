#!/usr/bin/env bash
#
# Cursor `stop` hook — runs after every agent turn.
#
# It runs the repo's fast correctness gate (lint + typecheck, the same checks
# CI blocks on). If either fails, it returns a `followup_message` so Cursor
# feeds the error output back to the agent as the next user message, letting the
# agent fix the problem before the turn really ends. On success it prints `{}`
# (no follow-up) so it never manufactures an infinite loop.
#
# Contract (Cursor Agent Hooks, schema v1):
#   stdin : { "status": "completed" | "aborted" | "error", "loop_count": N }
#   stdout: {}  OR  { "followup_message": "..." }   (must be the ONLY stdout)
#   Diagnostics go to stderr (the Hooks output channel), never stdout.
#
# Opt-in: set CURSOR_HOOK_RUN_BUILD=1 to also run the full `next build`
# (slow — minutes). By default we skip it; CI runs the build separately.
#
# Bypass: remove/disable this hook in Cursor's Hooks settings, or delete the
# `stop` entry from .cursor/hooks.json.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || { printf '%s\n' '{}'; exit 0; }

input="$(cat)"

status="completed"
loop_count=0
if command -v jq >/dev/null 2>&1; then
  parsed_status="$(printf '%s' "$input" | jq -r '.status // "completed"' 2>/dev/null)"
  parsed_loop="$(printf '%s' "$input" | jq -r '.loop_count // 0' 2>/dev/null)"
  [ -n "$parsed_status" ] && [ "$parsed_status" != "null" ] && status="$parsed_status"
  [ -n "$parsed_loop" ] && [ "$parsed_loop" != "null" ] && loop_count="$parsed_loop"
fi

# The user cancelled this turn — don't burn time on a full lint/typecheck cycle.
if [ "$status" = "aborted" ]; then
  echo "post-turn-verify: status=aborted — skipping checks" >&2
  printf '%s\n' '{}'
  exit 0
fi

# Cursor spawns hooks with its own bundled Node early on PATH, which can be
# older than the repo toolchain and break ESM-only packages. Strip it so the
# project's node/binaries win.
if command -v python3 >/dev/null 2>&1; then
  PATH="$(python3 -c 'import os
skip = (".cursor-server", ".vscode-server")
p = os.environ.get("PATH", "")
print(":".join(x for x in p.split(":") if x and not any(s in x for s in skip)))')"
  export PATH
fi

# Emit a follow-up message (valid JSON) and exit 0. Exit 0 is important: a
# non-zero exit signals "the hook crashed", not "a check failed".
emit_followup() {
  local label="$1" code="$2" file="$3"
  if command -v python3 >/dev/null 2>&1; then
    head -c 12000 "$file" | python3 -c '
import json, sys
label, code = sys.argv[1], sys.argv[2]
out = sys.stdin.read()
msg = (
    "The repo `stop` hook ran an automated check after your last turn "
    "(the same fast gate CI blocks on).\n\n"
    f"**Command:** `{label}`\n"
    f"**Result:** failed with exit code **{code}**.\n\n"
    "Fix the issues in the output below, then continue.\n\n"
    "```text\n" + out + "\n```\n"
)
print(json.dumps({"followup_message": msg}, ensure_ascii=False))
' "$label" "$code"
  else
    printf '{"followup_message":"The stop-hook check `%s` failed (exit %s). Re-run it locally and fix the errors before finishing."}\n' "$label" "$code"
  fi
  exit 0
}

# Run a check; on failure emit the follow-up and stop (first failure wins).
run_check() {
  local label="$1"; shift
  local tmp; tmp="$(mktemp)"
  echo "post-turn-verify: running ${label}…" >&2
  "$@" >"$tmp" 2>&1
  local code=$?
  if [ "$code" -ne 0 ]; then
    echo "post-turn-verify: ${label} FAILED (exit ${code})" >&2
    emit_followup "$label" "$code" "$tmp"
  fi
  rm -f "$tmp"
}

# Resolve toolchain binaries. Prefer the repo-local node_modules/.bin (works
# regardless of whether pnpm is on PATH in the hook environment).
if [ -x node_modules/.bin/eslint ]; then
  LINT=(node_modules/.bin/eslint .)
elif command -v pnpm >/dev/null 2>&1; then
  LINT=(pnpm run lint)
else
  LINT=(npx --no-install eslint .)
fi

if [ -x node_modules/.bin/tsc ]; then
  TYPECHECK=(node_modules/.bin/tsc --noEmit)
elif command -v pnpm >/dev/null 2>&1; then
  TYPECHECK=(pnpm exec tsc --noEmit)
else
  TYPECHECK=(npx --no-install tsc --noEmit)
fi

run_check "eslint ." "${LINT[@]}"
run_check "tsc --noEmit" "${TYPECHECK[@]}"

if [ "${CURSOR_HOOK_RUN_BUILD:-0}" = "1" ]; then
  run_check "next build" node scripts/build-hosted.mjs
fi

echo "post-turn-verify: all checks passed" >&2
printf '%s\n' '{}'
exit 0
