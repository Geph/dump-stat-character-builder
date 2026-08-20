#!/usr/bin/env bash
#
# Pre-push CI gate (version-controlled logic; installed via .git/hooks/pre-push).
#
# Kept as a compatibility entry point for older installed wrappers. New installs
# call scripts/verify-ci.mjs directly.
#
# Bypass in an emergency:  git push --no-verify
# Force the full suite:     PREPUSH_FULL=1 git push
#
# git invokes this as:  pre-push <remote-name> <remote-url>
# and streams one line per ref on stdin:
#   <local ref> <local sha> <remote ref> <remote sha>

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$ROOT" || exit 0
exec node "$ROOT/scripts/verify-ci.mjs" --pre-push
