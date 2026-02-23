#!/bin/bash
# Resize Carvd Studio window for screenshots
# Usage: ./resize-for-screenshots.sh [size]
#   size:
#     "large"     (1400x900)   legacy 16:9-ish
#     "small"     (800x600)    legacy 4:3
#     "large-hq"  (1920x1080)  recommended for 16:9 captures
#     "small-hq"  (1600x1200)  recommended for 4:3 captures
#   default: large-hq

SIZE=${1:-large-hq}

if [ "$SIZE" = "large" ]; then
    WIDTH=1400
    HEIGHT=900
    echo "Resizing to ${WIDTH}x${HEIGHT} (16:9 for hero shots)..."
elif [ "$SIZE" = "small" ]; then
    WIDTH=800
    HEIGHT=600
    echo "Resizing to ${WIDTH}x${HEIGHT} (4:3 for detail shots)..."
elif [ "$SIZE" = "large-hq" ]; then
    WIDTH=1920
    HEIGHT=1080
    echo "Resizing to ${WIDTH}x${HEIGHT} (HQ 16:9 capture, then downscale)..."
elif [ "$SIZE" = "small-hq" ]; then
    WIDTH=1600
    HEIGHT=1200
    echo "Resizing to ${WIDTH}x${HEIGHT} (HQ 4:3 capture, then downscale)..."
else
    echo "Unknown size: $SIZE"
    echo "Usage: ./resize-for-screenshots.sh [large|small|large-hq|small-hq]"
    exit 1
fi

# Find Carvd Studio window and place it fully within the visible desktop frame
# (excluding Dock/menu bar).
# 1) Prefer packaged app process name: "Carvd Studio"
# 2) Fallback to Electron windows whose title ends with " - Carvd Studio"
#    (excludes VS Code windows like "carvd-studio").
osascript <<EOF
tell application "System Events"
    set foundWindow to false
    set targetWin to missing value
    set targetProcName to ""

    -- Visible desktop bounds (excludes menu bar and Dock).
    -- On some macOS versions, System Events cannot resolve "window of desktop",
    -- so ask Finder first and fall back to conservative defaults.
    set desktopBounds to {0, 25, 1440, 900}
    try
        tell application "Finder"
            set desktopBounds to bounds of window of desktop
        end tell
    on error
        -- Keep fallback bounds above
    end try
    set desktopLeft to item 1 of desktopBounds
    set desktopTop to item 2 of desktopBounds
    set desktopRight to item 3 of desktopBounds
    set desktopBottom to item 4 of desktopBounds

    set visibleWidth to (desktopRight - desktopLeft)
    set visibleHeight to (desktopBottom - desktopTop)

    -- Safe margin so shadows/rounded corners don't touch edges
    set marginPx to 24
    set maxWidth to (visibleWidth - (marginPx * 2))
    set maxHeight to (visibleHeight - (marginPx * 2))

    set desiredWidth to ${WIDTH}
    set desiredHeight to ${HEIGHT}

    -- Keep aspect ratio while fitting inside visible frame.
    set finalWidth to desiredWidth
    set finalHeight to desiredHeight
    if (desiredWidth > maxWidth) or (desiredHeight > maxHeight) then
        set widthScale to (maxWidth / desiredWidth)
        set heightScale to (maxHeight / desiredHeight)
        set fitScale to widthScale
        if heightScale < fitScale then set fitScale to heightScale
        if fitScale <= 0 then set fitScale to 1
        set finalWidth to (desiredWidth * fitScale)
        set finalHeight to (desiredHeight * fitScale)
    end if

    set finalWidth to (round finalWidth)
    set finalHeight to (round finalHeight)
    if finalWidth < 640 then set finalWidth to 640
    if finalHeight < 480 then set finalHeight to 480

    -- Use top-left safe anchoring for predictable placement across multi-display setups
    set posX to desktopLeft + marginPx
    set posY to desktopTop + marginPx
    set posX to (round posX)
    set posY to (round posY)

    -- Packaged app process name
    if exists process "Carvd Studio" then
        tell process "Carvd Studio"
            if (count of windows) > 0 then
                set frontmost to true
                delay 0.2
                set targetWin to window 1
                set targetProcName to "Carvd Studio"
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
                            set targetWin to win
                            set targetProcName to "Electron"
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

    tell process targetProcName
        set frontmost to true
        delay 0.2
        set size of targetWin to {finalWidth, finalHeight}
        set position of targetWin to {posX, posY}
    end tell

    return ("resized-to:" & finalWidth & "x" & finalHeight & " at " & posX & "," & posY)
end tell
EOF

if [ $? -eq 0 ]; then
    echo "Done! Window resized and centered within visible desktop area (Dock/menu-safe)."
    echo ""
    echo "To capture:"
    echo "  Cmd+Shift+4, then Space, then click the window"
else
    echo ""
    echo "Error: Could not locate a Carvd Studio window."
    echo "Run packaged app or run dev app and open a project so title ends with ' - Carvd Studio'."
    exit 1
fi
