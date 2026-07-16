#!/usr/bin/env bash
#
# Pre-push test gate (version-controlled logic; installed via .git/hooks/pre-push).
#
# Runs the vitest suite before allowing a push and blocks the push if it fails.
# To stay fast, it only runs tests *affected by the diff being pushed*
# (`vitest run --changed <base>`), using the module graph to pick relevant
# specs. When it can't determine a diff base it falls back to the full suite.
#
# Bypass in an emergency:  git push --no-verify
# Force the full suite:     PREPUSH_FULL=1 git push
#
# git invokes this as:  pre-push <remote-name> <remote-url>
# and streams one line per ref on stdin:
#   <local ref> <local sha> <remote ref> <remote sha>

set -uo pipefail

ZERO="0000000000000000000000000000000000000000"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$ROOT" || exit 0

# Resolve a vitest runner. Prefer a direct node invocation of the local install
# (matches CI, and does not depend on pnpm being on PATH in the hook shell).
if [ -f node_modules/vitest/vitest.mjs ]; then
  VITEST=(node node_modules/vitest/vitest.mjs)
elif [ -x node_modules/.bin/vitest ]; then
  VITEST=(node_modules/.bin/vitest)
elif command -v pnpm >/dev/null 2>&1; then
  VITEST=(pnpm exec vitest)
else
  VITEST=(npx --no-install vitest)
fi

run_full() {
  echo "pre-push: running full vitest suite…" >&2
  "${VITEST[@]}" run
}

# Read the refs being pushed from stdin and pick a diff base.
base=""
have_ref=0
while read -r local_ref local_sha remote_ref remote_sha; do
  [ -z "${local_sha:-}" ] && continue
  have_ref=1

  # Branch/tag deletion — nothing to test for this ref.
  if [ "$local_sha" = "$ZERO" ]; then
    continue
  fi

  if [ "${remote_sha:-$ZERO}" != "$ZERO" ] && git cat-file -e "$remote_sha" 2>/dev/null; then
    # Updating an existing remote branch: diff against what's already there.
    base="$remote_sha"
  elif git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    # New branch on the remote: diff against the merge-base with origin/main.
    mb="$(git merge-base origin/main "$local_sha" 2>/dev/null)"
    base="${mb:-origin/main}"
  fi
done

# Explicit override or no computable base -> run everything.
if [ -n "${PREPUSH_FULL:-}" ]; then
  run_full
  exit $?
fi

if [ "$have_ref" -eq 0 ]; then
  # Nothing came in on stdin (unusual) — be safe and run the full suite.
  run_full
  exit $?
fi

if [ -z "$base" ]; then
  echo "pre-push: no diff base available — running full suite" >&2
  run_full
  code=$?
else
  echo "pre-push: running tests affected by changes since ${base}…" >&2
  # --passWithNoTests so a docs-only / no-related-tests push isn't blocked.
  "${VITEST[@]}" run --changed "$base" --passWithNoTests
  code=$?
fi

if [ "$code" -ne 0 ]; then
  {
    echo ""
    echo "pre-push: tests failed — push BLOCKED."
    echo "  • Fix the failing tests, or"
    echo "  • run the full suite with:  PREPUSH_FULL=1 git push, or"
    echo "  • bypass in an emergency with:  git push --no-verify"
  } >&2
  exit 1
fi

echo "pre-push: tests passed — allowing push" >&2
exit 0
