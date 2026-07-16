#!/usr/bin/env bash
#
# Installs the local git hooks. Run once per clone (git hooks in .git/hooks are
# not version-controlled, so a fresh clone needs this):
#
#   bash scripts/hooks/install.sh
#
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$(git rev-parse --git-path hooks)"
mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/pre-push" <<'WRAPPER'
#!/usr/bin/env bash
# Auto-installed wrapper. Real, version-controlled logic lives in
# scripts/hooks/pre-push.sh so it can be reviewed and shared.
# Reinstall after a fresh clone with:  bash scripts/hooks/install.sh
root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
hook="$root/scripts/hooks/pre-push.sh"
[ -x "$hook" ] || { echo "pre-push: $hook missing/not executable — skipping" >&2; exit 0; }
exec "$hook" "$@"
WRAPPER

chmod +x "$HOOK_DIR/pre-push"
chmod +x "$ROOT/scripts/hooks/pre-push.sh" 2>/dev/null || true

echo "Installed pre-push hook -> $HOOK_DIR/pre-push"
