interface ScreenshotPlaceholderProps {
  tooltip: string;
  aspectRatio?: "16:9" | "4:3" | "1:1";
  className?: string;
}

/**
 * A placeholder component for screenshots that will be added later.
 * Displays a styled box with a camera icon and tooltip describing what screenshot is needed.
 */
export default function ScreenshotPlaceholder({
  tooltip,
  aspectRatio = "16:9",
  className = "",
}: ScreenshotPlaceholderProps) {
  const aspectRatioStyles: Record<string, string> = {
    "16:9": "56.25%", // 9/16 = 0.5625
    "4:3": "75%", // 3/4 = 0.75
    "1:1": "100%",
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border/80 bg-surface/85 shadow-sm ${className}`}
      title={tooltip}
      style={{ paddingTop: aspectRatioStyles[aspectRatio] }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/70 p-6 text-center">
        <div className="mb-4 text-text-muted/70">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Camera"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </div>
        <p className="max-w-[320px] text-sm text-text-muted">{tooltip}</p>
      </div>
    </div>
  );
}
