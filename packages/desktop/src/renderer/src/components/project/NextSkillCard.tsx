import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useCapabilityDiscoveryStore } from '@renderer/store/capabilityDiscoveryStore';
import { getDocsUrl } from '@renderer/utils/docsLinks';
import type { CapabilitySuggestion } from '@renderer/utils/capabilityDiscovery';

/**
 * How long the card must actually be on screen before it counts as shown.
 *
 * Long enough that a card which flashed past during a reload or a launch
 * straight into a recent project has not used up the week, short enough that
 * anyone who reads it has spent it.
 */
const IMPRESSION_MS = 1500;

/**
 * One thing this maker has never reached for.
 *
 * Shown on the start screen and nowhere else: a suggestion that interrupts an
 * edit is an interruption whatever it says, and the moment before opening a
 * project is the only one where trying something new is actually convenient.
 *
 * It offers a capability rather than reporting an absence. The maker has not
 * done anything wrong by never dropping a guide plane, and a card that says so
 * reads as a scold; one that says what guides are for reads as an offer.
 */
export function NextSkillCard(): React.JSX.Element | null {
  const load = useCapabilityDiscoveryStore((s) => s.load);
  const currentSuggestion = useCapabilityDiscoveryStore((s) => s.currentSuggestion);
  const markSuggested = useCapabilityDiscoveryStore((s) => s.markSuggested);
  const dismiss = useCapabilityDiscoveryStore((s) => s.dismiss);
  const undismiss = useCapabilityDiscoveryStore((s) => s.undismiss);
  const usage = useCapabilityDiscoveryStore((s) => s.usage);
  const loaded = useCapabilityDiscoveryStore((s) => s.loaded);

  // Held in state so the card cannot change under the reader's hands when the
  // store settles mid-view.
  const [suggestion, setSuggestion] = useState<CapabilitySuggestion | null>(null);
  const [dismissed, setDismissed] = useState<CapabilitySuggestion | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const counted = useRef(false);
  // Answered this session, so the card does not come straight back while the
  // store is still catching up with the answer.
  const handled = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loaded || suggestion || handled.current) return;
    const next = currentSuggestion();
    if (next) setSuggestion(next);
  }, [loaded, usage, suggestion, currentSuggestion]);

  /**
   * Acting on the card is a suggestion delivered, however briefly it was up.
   * Someone who reaches for a button has read it, and the next one is a week
   * away whether they said later or said never.
   */
  const spendSuggestion = () => {
    handled.current = true;
    if (counted.current) return;
    counted.current = true;
    void markSuggested();
  };

  // A suggestion is spent only once it has genuinely been on screen, in a
  // window someone is looking at. Counting it at render meant a card that
  // mounted behind another window, scrolled out of view, or flashed past on
  // the way into a recent project used up the whole week without ever being
  // read -- the feature failing silently at the one thing it exists to do.
  useEffect(() => {
    const element = cardRef.current;
    if (!suggestion || counted.current || !element) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let onScreen = true;

    const stop = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
    const reconsider = () => {
      const watched = onScreen && (typeof document === 'undefined' || document.visibilityState !== 'hidden');
      if (!watched) {
        stop();
        return;
      }
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        counted.current = true;
        void markSuggested();
      }, IMPRESSION_MS);
    };

    // Where the browser cannot say what is on screen, the timer alone still
    // rules out the flashes; it is a weaker guarantee, not no guarantee.
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              onScreen = entries.some((entry) => entry.isIntersecting);
              reconsider();
            },
            { threshold: 0.5 }
          );
    observer?.observe(element);
    document?.addEventListener?.('visibilitychange', reconsider);
    reconsider();

    return () => {
      stop();
      observer?.disconnect();
      document?.removeEventListener?.('visibilitychange', reconsider);
    };
  }, [suggestion, markSuggested]);

  if (dismissed) {
    return (
      <div
        role="status"
        className="shrink-0 rounded-lg border border-border bg-bg-subtle px-4 py-3 text-[13px] text-text-muted"
      >
        <span>{dismissed.info.label} won&apos;t be suggested again.</span>
        <Button
          size="xs"
          variant="ghost"
          className="ml-2"
          onClick={() => {
            void undismiss(dismissed.capability);
            setDismissed(null);
          }}
        >
          Undo
        </Button>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <section
      ref={cardRef}
      aria-labelledby="next-skill-heading"
      className="shrink-0 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {/* Says why this is here at all: without it, a capability's name
              appearing above the templates is a non sequitur. */}
          <p className="text-[11px] uppercase tracking-wide text-text-muted">Something you haven&apos;t tried</p>
          <h2 id="next-skill-heading" className="mt-0.5 text-sm font-medium text-text">
            {suggestion.info.label}
          </h2>
          <p className="mt-0.5 text-[13px] leading-snug text-text-muted">{suggestion.info.pitch}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                spendSuggestion();
                window.electronAPI?.openExternal?.(getDocsUrl(suggestion.info.docs));
              }}
            >
              Show me how
            </Button>
            {/* "Maybe later" rather than "Not now": the next one is a week
                away, and a label that sounds like a short snooze would be a
                small lie told every time. */}
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                spendSuggestion();
                setSuggestion(null);
              }}
            >
              Maybe later
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                spendSuggestion();
                void dismiss(suggestion.capability);
                setDismissed(suggestion);
                setSuggestion(null);
              }}
            >
              Don&apos;t suggest this
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
