#!/usr/bin/env bash
#
# Cursor `stop` hook — runs after agent turns (quietly when possible).
#
# Default behavior (less intrusive):
#   - Skip when no relevant source files changed since the last successful run
#   - Keep stderr quiet unless CURSOR_HOOK_VERBOSE=1 (Cursor may still flash the
#     Hooks output channel; that is IDE UI and cannot be fully suppressed here)
#   - On failure, emit followup_message so the agent can fix issues
#
# Force a run: CURSOR_HOOK_FORCE=1
# Also run next build: CURSOR_HOOK_RUN_BUILD=1
# Bypass: remove the `stop` entry from .cursor/hooks.json

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || { printf '%s\n' '{}'; exit 0; }

STAMP_FILE="$ROOT/.git/dumpstat-post-turn-verify"
VERBOSE="${CURSOR_HOOK_VERBOSE:-0}"

log() {
  if [ "$VERBOSE" = "1" ]; then
    echo "post-turn-verify: $*" >&2
  fi
}

input="$(cat)"

status="completed"
loop_count=0
if command -v jq >/dev/null 2>&1; then
  parsed_status="$(printf '%s' "$input" | jq -r '.status // "completed"' 2>/dev/null)"
  parsed_loop="$(printf '%s' "$input" | jq -r '.loop_count // 0' 2>/dev/null)"
  [ -n "$parsed_status" ] && [ "$parsed_status" != "null" ] && status="$parsed_status"
  [ -n "$parsed_loop" ] && [ "$parsed_loop" != "null" ] && loop_count="$parsed_loop"
fi

if [ "$status" = "aborted" ]; then
  log "status=aborted — skipping"
  printf '%s\n' '{}'
  exit 0
fi

# Prefer project Node over Cursor's bundled runtime.
if command -v python3 >/dev/null 2>&1; then
  PATH="$(python3 - <<'PY'
import os
skip = (".cursor-server", ".vscode-server")
sep = os.pathsep
parts = [p for p in os.environ.get("PATH", "").split(sep) if p and not any(s in p for s in skip)]
print(sep.join(parts))
PY
)"
  export PATH
elif command -v python >/dev/null 2>&1; then
  PATH="$(python - <<'PY'
import os
skip = (".cursor-server", ".vscode-server")
sep = os.pathsep
parts = [p for p in os.environ.get("PATH", "").split(sep) if p and not any(s in p for s in skip)]
print(sep.join(parts))
PY
)"
  export PATH
fi

emit_followup() {
  local label="$1" code="$2" file="$3"
  # Failures always log — useful in Hooks channel when something broke.
  echo "post-turn-verify: ${label} FAILED (exit ${code})" >&2
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

run_check() {
  local label="$1"; shift
  local tmp; tmp="$(mktemp)"
  log "running ${label}…"
  "$@" >"$tmp" 2>&1
  local code=$?
  if [ "$code" -ne 0 ]; then
    emit_followup "$label" "$code" "$tmp"
  fi
  rm -f "$tmp"
}

list_relevant_changes() {
  {
    git diff --name-only HEAD 2>/dev/null || true
    git diff --cached --name-only 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | grep -E '\.(ts|tsx|js|jsx|mjs|cjs|json)$' | grep -Ev '(^|/)(node_modules|\.next)/' || true
}

changes_since_stamp() {
  if [ ! -f "$STAMP_FILE" ]; then
    return 0
  fi
  local changed
  changed="$(list_relevant_changes)"
  if [ -z "$changed" ]; then
    return 1
  fi
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    [ ! -e "$path" ] && continue
    if [ "$path" -nt "$STAMP_FILE" ]; then
      return 0
    fi
  done <<< "$changed"
  return 1
}

should_run() {
  if [ "${CURSOR_HOOK_FORCE:-0}" = "1" ]; then
    return 0
  fi
  # Always re-check when we are already in a fix-up follow-up loop.
  if [ "${loop_count:-0}" -gt 0 ] 2>/dev/null; then
    return 0
  fi
  if ! changes_since_stamp; then
    return 1
  fi
  return 0
}

if ! should_run; then
  log "skipped (no relevant source changes since last pass)"
  printf '%s\n' '{}'
  exit 0
fi

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

should_run_import_smoke() {
  if [ "${CURSOR_HOOK_SKIP_IMPORT_SMOKE:-0}" = "1" ]; then
    return 1
  fi
  if [ "${CURSOR_HOOK_IMPORT_SMOKE:-0}" = "1" ]; then
    return 0
  fi
  local changed
  changed="$(git diff --name-only HEAD 2>/dev/null; git diff --cached --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)"
  printf '%s\n' "$changed" | grep -Eq \
    '(^|/)(lib/import/(homebrew-import-ops|enrichment-presets|content-schema\.ts|modifier-wiring-registry\.ts|third-party-resources\.ts|parse-class-progression-table\.ts)|lib/import/__tests__/(homebrew-|investigator-|necromancer-|martyr-)|scripts/homebrew-import-ops\.ts|docs/homebrew-import-review\.md)'
}

if should_run_import_smoke; then
  if [ -f node_modules/vitest/vitest.mjs ]; then
    IMPORT_SMOKE=(node node_modules/vitest/vitest.mjs run lib/import/__tests__/homebrew-import-ops.test.ts lib/import/__tests__/homebrew-prompt-footguns.test.ts lib/import/__tests__/homebrew-enrichment-smoke.test.ts lib/import/__tests__/homebrew-drive-audit-smoke.test.ts lib/import/__tests__/investigator-martyr-drive-import.test.ts lib/import/__tests__/necromancer-drive-import.test.ts lib/import/__tests__/vagabond-import.test.ts)
  elif [ -x node_modules/.bin/vitest ]; then
    IMPORT_SMOKE=(node_modules/.bin/vitest run lib/import/__tests__/homebrew-import-ops.test.ts lib/import/__tests__/homebrew-prompt-footguns.test.ts lib/import/__tests__/homebrew-enrichment-smoke.test.ts lib/import/__tests__/homebrew-drive-audit-smoke.test.ts lib/import/__tests__/investigator-martyr-drive-import.test.ts lib/import/__tests__/necromancer-drive-import.test.ts lib/import/__tests__/vagabond-import.test.ts)
  else
    IMPORT_SMOKE=(npx --no-install vitest run lib/import/__tests__/homebrew-import-ops.test.ts lib/import/__tests__/homebrew-prompt-footguns.test.ts lib/import/__tests__/homebrew-enrichment-smoke.test.ts lib/import/__tests__/homebrew-drive-audit-smoke.test.ts lib/import/__tests__/investigator-martyr-drive-import.test.ts lib/import/__tests__/necromancer-drive-import.test.ts lib/import/__tests__/vagabond-import.test.ts)
  fi
  run_check "vitest import-homebrew smoke" "${IMPORT_SMOKE[@]}"
else
  log "import-homebrew smoke skipped"
fi

if [ "${CURSOR_HOOK_RUN_BUILD:-0}" = "1" ]; then
  run_check "next build" node scripts/build-hosted.mjs
fi

touch "$STAMP_FILE" 2>/dev/null || true
log "all checks passed"
printf '%s\n' '{}'
exit 0
