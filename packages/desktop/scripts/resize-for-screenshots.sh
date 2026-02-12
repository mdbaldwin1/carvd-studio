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

# Find Carvd Studio window by title (works for both dev and production)
# This avoids confusion with VSCode which is also Electron-based
osascript <<EOF
tell application "System Events"
    set foundWindow to false

    -- First try production app name
    if exists process "Carvd Studio" then
        tell process "Carvd Studio"
            set frontmost to true
            delay 0.2
            set size of window 1 to {${WIDTH}, ${HEIGHT}}
            set position of window 1 to {100, 100}
        end tell
        set foundWindow to true
    end if

    -- If not found, look for Electron window with "Carvd" in title
    if not foundWindow then
        repeat with proc in (every process whose background only is false)
            if name of proc is "Electron" then
                tell proc
                    repeat with win in windows
                        if name of win contains "Carvd" then
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
        error "Could not find Carvd Studio window. Make sure the app is running."
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
    echo "Error: Carvd Studio is not running."
    echo "Start it with: npm run dev:desktop"
    exit 1
fi
