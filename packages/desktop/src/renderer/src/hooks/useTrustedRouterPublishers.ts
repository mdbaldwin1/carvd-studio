import { useCallback, useEffect, useState } from 'react';
import {
  addTrustedRouterPublisher,
  parseTrustedRouterPublishers,
  removeTrustedRouterPublisher,
  type TrustedRouterPublisher
} from '../../../shared/routerPublisherTrust';

const KEY = 'trustedRouterPublishers';
export function useTrustedRouterPublishers() {
  const [publishers, setPublishers] = useState<TrustedRouterPublisher[]>([]);
  useEffect(() => {
    void window.electronAPI
      ?.getPreference?.(KEY)
      .then((value) => setPublishers(parseTrustedRouterPublishers(value)))
      .catch(() => setPublishers([]));
  }, []);
  const save = useCallback(async (next: TrustedRouterPublisher[]) => {
    await window.electronAPI.setPreference(KEY, next);
    setPublishers(next);
  }, []);
  const trust = useCallback(
    async (publisher: TrustedRouterPublisher) => save(addTrustedRouterPublisher(publishers, publisher)),
    [publishers, save]
  );
  const remove = useCallback(
    async (keyId: string) => save(removeTrustedRouterPublisher(publishers, keyId)),
    [publishers, save]
  );
  return { publishers, trust, remove };
}
