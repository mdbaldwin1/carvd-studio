export interface EventBindingTarget {
  addEventListener(type: string, listener: unknown, options?: unknown): void;
  removeEventListener(type: string, listener: unknown, options?: unknown): void;
}

export type EventBinding = readonly [type: string, listener: unknown, options?: unknown];

function addEventListener(target: EventBindingTarget, [type, listener, options]: EventBinding): void {
  if (options === undefined) {
    target.addEventListener(type, listener);
  } else {
    target.addEventListener(type, listener, options);
  }
}

function removeEventListener(target: EventBindingTarget, [type, listener, options]: EventBinding): void {
  if (options === undefined) {
    target.removeEventListener(type, listener);
  } else {
    target.removeEventListener(type, listener, options);
  }
}

export function bindEventListeners(target: EventBindingTarget, bindings: ReadonlyArray<EventBinding>): () => void {
  for (const binding of bindings) {
    addEventListener(target, binding);
  }

  return () => {
    for (const binding of bindings) {
      removeEventListener(target, binding);
    }
  };
}
