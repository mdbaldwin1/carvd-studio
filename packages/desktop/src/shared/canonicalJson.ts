const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function canonicalJson(value: unknown, excludedKeys: readonly string[] = []): string {
  const excluded = new Set(excludedKeys);
  const state = { nodes: 0 };
  const normalize = (candidate: unknown, depth = 0): unknown => {
    state.nodes += 1;
    if (depth > 64 || state.nodes > 100_000) throw new RangeError('Canonical JSON input exceeds depth or node limit');
    if (Array.isArray(candidate)) return candidate.map((item) => normalize(item, depth + 1));
    if (!isRecord(candidate)) return candidate;
    return Object.fromEntries(
      Object.keys(candidate)
        .filter((key) => !excluded.has(key) && candidate[key] !== undefined)
        .sort()
        .map((key) => [key, normalize(candidate[key], depth + 1)])
    );
  };
  return JSON.stringify(normalize(value));
}
