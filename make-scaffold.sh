#!/usr/bin/env bash
# make-scaffold.sh — create the launch-campaign directory tree.
#
# Usage:
#   ./make-scaffold.sh <target-dir> [--with-templates]
#
# Creates the numbered stage folders, qa/, and sources/ under <target-dir>.
# Existing directories are left alone; the script is safe to re-run.
# With --with-templates, also copies the manifest schema, ledger templates,
# and crosswalk template into the new tree (never overwriting existing files).

set -euo pipefail

TARGET="${1:-}"
WITH_TEMPLATES="${2:-}"

if [ -z "$TARGET" ] || [ "$TARGET" = "-h" ] || [ "$TARGET" = "--help" ]; then
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

KIT_DIR="$(cd "$(dirname "$0")" && pwd)"

DIRS=(
  "01_brand/source"
  "01_brand/exports"
  "01_brand/guidelines"
  "02_social/source"
  "02_social/exports"
  "02_social/captions"
  "03_longform/drafts"
  "03_longform/exports"
  "04_funding_page/page"
  "04_funding_page/images"
  "04_funding_page/video"
  "05_launch_plan/email"
  "05_launch_plan/outreach"
  "05_launch_plan/calendar"
  "06_operations/support"
  "06_operations/fulfilment"
  "06_operations/runbooks"
  "07_governance"
  "08_archive/deliverables"
  "08_archive/superseded"
  "qa/exports"
  "qa/reports"
  "sources/licences"
  "sources/permissions"
  "sources/references"
)

for d in "${DIRS[@]}"; do
  mkdir -p "$TARGET/$d"
done

# Keep empty stage folders present in version control.
for d in "${DIRS[@]}"; do
  keep="$TARGET/$d/.gitkeep"
  [ -e "$keep" ] || : > "$keep"
done

copy_if_absent() {
  src="$1"; dst="$2"
  if [ -f "$src" ] && [ ! -e "$dst" ]; then
    cp "$src" "$dst"
    echo "  added $dst"
  fi
}

if [ "$WITH_TEMPLATES" = "--with-templates" ]; then
  echo "Copying templates:"
  copy_if_absent "$KIT_DIR/schema/campaign-manifest.schema.json" "$TARGET/campaign-manifest.schema.json"
  copy_if_absent "$KIT_DIR/templates/claims-ledger.template.json" "$TARGET/07_governance/claims-ledger.json"
  copy_if_absent "$KIT_DIR/templates/rights-ledger.template.json" "$TARGET/07_governance/rights-ledger.json"
  copy_if_absent "$KIT_DIR/templates/crosswalk.template.md" "$TARGET/07_governance/crosswalk.md"
fi

echo "Scaffold ready at: $TARGET"
echo "Next: write campaign-manifest.json, then open 07_governance/ and start filling ledgers."
