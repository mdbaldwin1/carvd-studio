#!/usr/bin/env bash
set -euo pipefail

# Assisted screenshot capture for website assets.
# Targets:
# 1) Packaged app process "Carvd Studio" (preferred)
# 2) Fallback dev Electron window title ending with " - Carvd Studio"
#    to avoid VS Code/Electron collisions.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OUT_DIR="$ROOT_DIR/packages/website/public/screenshots"
RESIZE_SCRIPT="$ROOT_DIR/packages/desktop/scripts/resize-for-screenshots.sh"

mkdir -p "$OUT_DIR"

log() {
  echo "[capture] $*"
}

require_carvd_window() {
  osascript <<'EOF' >/dev/null
tell application "System Events"
  set found to false
  set targetWin to missing value
  if exists process "Carvd Studio" then
    tell process "Carvd Studio"
      if (count of windows) > 0 then
        set targetWin to window 1
        set found to true
      end if
    end tell
  end if

  if not found then
    repeat with p in (every process whose background only is false)
      if name of p is "Electron" then
        tell p
          repeat with w in windows
            try
              set n to name of w
            on error
              set n to ""
            end try
            if n ends with " - Carvd Studio" then
              set targetWin to w
              set found to true
              exit repeat
            end if
          end repeat
        end tell
      end if
      if found then exit repeat
    end repeat
  end if

  if targetWin is missing value then error "Could not find Carvd Studio window (packaged or '* - Carvd Studio' dev window)."
end tell
EOF
}

get_carvd_bounds() {
  osascript <<'EOF'
tell application "System Events"
  set found to false
  set targetWin to missing value
  set targetProcName to ""
  if exists process "Carvd Studio" then
    tell process "Carvd Studio"
      if (count of windows) > 0 then
        set targetProcName to "Carvd Studio"
        set targetWin to window 1
        set found to true
      end if
    end tell
  end if

  if not found then
    repeat with p in (every process whose background only is false)
      if name of p is "Electron" then
        tell p
          repeat with w in windows
            try
              set n to name of w
            on error
              set n to ""
            end try
            if n ends with " - Carvd Studio" then
              set targetProcName to "Electron"
              set targetWin to w
              set found to true
              exit repeat
            end if
          end repeat
        end tell
      end if
      if found then exit repeat
    end repeat
  end if

  if targetWin is missing value then error "Could not find Carvd Studio window"

  tell process targetProcName
    set frontmost to true
    delay 0.15
    set p to position of targetWin
    set s to size of targetWin
  end tell

  return ((item 1 of p as string) & "," & (item 2 of p as string) & "," & (item 1 of s as string) & "," & (item 2 of s as string))
end tell
EOF
}

capture_window() {
  local outfile="$1"
  local bounds
  bounds="$(get_carvd_bounds)"
  /usr/sbin/screencapture -x -R "$bounds" "$outfile"
}

prepare_size() {
  local size="$1"
  "$RESIZE_SCRIPT" "$size" >/dev/null
  sleep 0.4
}

capture_shot() {
  local capture_size="$1"
  local file="$2"
  local target_w="$3"
  local target_h="$4"
  local prompt="$5"
  local delay_seconds="${6:-0}"

  prepare_size "$capture_size"
  echo ""
  echo "------------------------------------------------------------"
  echo "Target: $file (${target_w}x${target_h}) [capture preset: ${capture_size}]"
  echo "$prompt"
  read -r -p "Set up the app exactly as desired, then press Enter to capture... " _

  if [ "$delay_seconds" -gt 0 ]; then
    echo "[capture] Starting ${delay_seconds}s countdown..."
    while [ "$delay_seconds" -gt 0 ]; do
      echo "  ${delay_seconds}..."
      sleep 1
      delay_seconds=$((delay_seconds - 1))
    done
    echo "  Capturing now."
  fi

  capture_window "$OUT_DIR/$file"
  /usr/bin/sips -z "$target_h" "$target_w" "$OUT_DIR/$file" >/dev/null
  log "Saved: $OUT_DIR/$file"
}

report_duplicates() {
  if [ ! -d "$OUT_DIR" ]; then
    return
  fi
  local report
  report="$(shasum "$OUT_DIR"/*.png 2>/dev/null | awk '{print $1}' | sort | uniq -cd || true)"
  if [ -n "$report" ]; then
    echo ""
    echo "[capture] WARNING: Duplicate-image hashes detected (likely repeated UI states):"
    echo "$report"
    echo "[capture] Re-run and set distinct UI state before each prompt."
  fi
}

main() {
  require_carvd_window
  log "Starting assisted screenshot capture."
  log "Output dir: $OUT_DIR"
  log "Using HQ capture presets (larger window) before resize for readability."

  # Home/Features required shots
  capture_shot "large-hq" "hero-workspace.png" 1400 788 \
    "Hero: main 3D workspace with realistic project, sidebar, viewport, and properties panel."
  capture_shot "small-hq" "cut-list-diagrams.png" 800 600 \
    "Cut List modal open on Diagrams tab, optimized board layouts visible."
  capture_shot "small-hq" "shopping-list.png" 800 600 \
    "Cut List modal open on Shopping tab with quantities/costs/utilization."
  capture_shot "large-hq" "features-3d-workspace.png" 1400 788 \
    "3D workspace with dimensions visible and a part selected."
  capture_shot "large-hq" "features-cut-list.png" 1400 788 \
    "Cut List Diagrams view showing multiple boards."
  capture_shot "large-hq" "features-cost-tracking.png" 1400 788 \
    "Stock/cost tracking view (library modal or properties with costs)."

  # Optional docs shots
  capture_shot "large-hq" "docs-interface-overview.png" 1400 788 \
    "Main interface overview with sidebar, viewport, properties, and header."
  capture_shot "small-hq" "docs-properties-panel.png" 800 600 \
    "Close-up of properties panel with fields clearly readable."
  capture_shot "small-hq" "docs-parts-tab.png" 800 600 \
    "Cut List modal on Parts tab with grouped dimensions/quantities."
  capture_shot "small-hq" "docs-stock-library.png" 800 600 \
    "App Library modal, Stocks tab, stock list and right editor/details visible."
  capture_shot "small-hq" "docs-groups-sidebar.png" 800 600 \
    "Sidebar showing nested groups/subgroups expanded."
  capture_shot "small-hq" "docs-assembly-library.png" 800 600 \
    "App Library modal, Assemblies tab with list/details."
  capture_shot "small-hq" "docs-snap-lines.png" 800 600 \
    "Mid-drag interaction showing snapping/alignment guides." 3
  capture_shot "small-hq" "docs-settings.png" 800 600 \
    "App Settings modal open with settings sections visible."
  capture_shot "small-hq" "docs-new-project.png" 800 600 \
    "New Project dialog with name/material selection visible."

  echo ""
  log "All checklist screenshots captured."
  report_duplicates
}

main "$@"
