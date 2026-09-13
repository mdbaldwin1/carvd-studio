import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useCapabilityDiscoveryStore } from '@renderer/store/capabilityDiscoveryStore';
import { getDocsUrl } from '@renderer/utils/docsLinks';
import type { CapabilitySuggestion } from '@renderer/utils/capabilityDiscovery';

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
  const usage = useCapabilityDiscoveryStore((s) => s.usage);
  const loaded = useCapabilityDiscoveryStore((s) => s.loaded);

  // Held in state so the card cannot change under the reader's hands when the
  // store settles mid-view.
  const [suggestion, setSuggestion] = useState<CapabilitySuggestion | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loaded || suggestion) return;
    const next = currentSuggestion();
    if (!next) return;
    setSuggestion(next);
    void markSuggested();
  }, [loaded, usage, suggestion, currentSuggestion, markSuggested]);

  if (!suggestion) return null;

  return (
    <div className="shrink-0 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          {/* Says why this is here at all: without it, a capability's name
              appearing above the templates is a non sequitur. */}
          <div className="text-[11px] uppercase tracking-wide text-text-muted">Something you haven&apos;t tried</div>
          <div className="mt-0.5 text-sm font-medium text-text">{suggestion.info.label}</div>
          <p className="mt-0.5 text-[13px] leading-snug text-text-muted">{suggestion.info.pitch}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => window.electronAPI?.openExternal?.(getDocsUrl(suggestion.info.docs))}
            >
              Show me how
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setSuggestion(null)}>
              Not now
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                void dismiss(suggestion.capability);
                setSuggestion(null);
              }}
            >
              Don&apos;t suggest this
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
