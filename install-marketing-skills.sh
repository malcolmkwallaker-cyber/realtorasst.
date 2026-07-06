#!/usr/bin/env bash
# One-command installer for the AI Marketing Skills for Claude Code.
#
# From inside this repo:        ./install-marketing-skills.sh [target-project-dir]
# From anywhere (one command):  curl -fsSL <RAW_URL>/install-marketing-skills.sh | bash
#
# Installs all /market-* skills into <target>/.claude/skills so they appear
# as slash commands the next time Claude Code starts in that project.
set -euo pipefail

REPO="malcolmkwallaker-cyber/realtorasst."
REF="${MARKETING_SKILLS_REF:-claude/real-estate-daily-assistant-GgwfR}"
TARGET="${1:-$(pwd)}"

mkdir -p "$TARGET/.claude/skills"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd || true)"

if [ -n "$SCRIPT_DIR" ] && compgen -G "$SCRIPT_DIR/.claude/skills/market-*" >/dev/null; then
  # Running from a local clone — copy directly.
  cp -R "$SCRIPT_DIR"/.claude/skills/market-* "$TARGET/.claude/skills/"
else
  # Piped from curl — download the repo tarball and extract the skills.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  echo "Downloading skills from github.com/$REPO@$REF ..."
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$TMP" --strip-components=1
  cp -R "$TMP"/.claude/skills/market-* "$TARGET/.claude/skills/"
fi

echo ""
echo "Installation complete. Skills installed to $TARGET/.claude/skills:"
echo ""
for d in "$TARGET"/.claude/skills/market-*/; do
  name="$(basename "$d")"
  printf '  /%s\n' "$name"
done
cat <<'EOF'

Start (or restart) Claude Code in that project, then try:

  /market-audit https://yourwebsite.com      # full 5-agent marketing audit
  /market-report-pdf                          # client-ready PDF of the audit

The PDF generator needs Python 3; it will install 'reportlab' on first run.
EOF
