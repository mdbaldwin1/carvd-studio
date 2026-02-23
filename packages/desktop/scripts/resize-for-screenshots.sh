#!/bin/bash
# Resize Carvd Studio window for screenshots
# Usage: ./resize-for-screenshots.sh [size]
#   size: "large" (1400x900) or "small" (800x600)
#   default: large

SIZE=${1:-large}

if [ "$SIZE" = "large" ]; then
    WIDTH=1400
    HEIGHT=900
    echo "Resizing to ${WIDTH}x${HEIGHT} (16:9 for hero shots)..."
elif [ "$SIZE" = "small" ]; then
    WIDTH=800
    HEIGHT=600
    echo "Resizing to ${WIDTH}x${HEIGHT} (4:3 for detail shots)..."
else
    echo "Unknown size: $SIZE"
    echo "Usage: ./resize-for-screenshots.sh [large|small]"
    exit 1
fi

# Find Carvd Studio window.
# 1) Prefer packaged app process name: "Carvd Studio"
# 2) Fallback to Electron windows whose title ends with " - Carvd Studio"
#    (excludes VS Code windows like "carvd-studio").
osascript <<EOF
tell application "System Events"
    set foundWindow to false

    -- Packaged app process name
    if exists process "Carvd Studio" then
        tell process "Carvd Studio"
            if (count of windows) > 0 then
                set frontmost to true
                delay 0.2
                set size of window 1 to {${WIDTH}, ${HEIGHT}}
                set position of window 1 to {100, 100}
                set foundWindow to true
            end if
        end tell
    end if

    -- Dev fallback: Electron window title must look like "<project> - Carvd Studio"
    if not foundWindow then
        repeat with proc in (every process whose background only is false)
            if name of proc is "Electron" then
                tell proc
                    repeat with win in windows
                        try
                            set winName to name of win
                        on error
                            set winName to ""
                        end try
                        if winName ends with " - Carvd Studio" then
                            set frontmost to true
                            delay 0.2
                            set size of win to {${WIDTH}, ${HEIGHT}}
                            set position of win to {100, 100}
                            set foundWindow to true
                            exit repeat
                        end if
                    end repeat
                end tell
                if foundWindow then exit repeat
            end if
        end repeat
    end if

    if not foundWindow then
        error "Could not find Carvd Studio window (packaged or '* - Carvd Studio' dev window)."
    end if
end tell
EOF

if [ $? -eq 0 ]; then
    echo "Done! Window resized to ${WIDTH}x${HEIGHT} and moved to top-left."
    echo ""
    echo "To capture:"
    echo "  Cmd+Shift+4, then Space, then click the window"
else
    echo ""
    echo "Error: Could not locate a Carvd Studio window."
    echo "Run packaged app or run dev app and open a project so title ends with ' - Carvd Studio'."
    exit 1
fi
