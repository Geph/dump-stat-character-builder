#!/usr/bin/env bash
#
# Compatibility wrapper. The cross-platform installer is install.mjs.
#
#   bash scripts/hooks/install.sh
#
ROOT="$(git rev-parse --show-toplevel)"
exec node "$ROOT/scripts/hooks/install.mjs"
