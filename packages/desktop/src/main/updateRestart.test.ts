import { describe, expect, it, vi } from 'vitest';
import { createUpdateRestart } from './updateRestart';

function setup() {
  const requestQuit = vi.fn();
  const install = vi.fn();
  const deferred: Array<() => void> = [];
  const restart = createUpdateRestart({ requestQuit, install, defer: (callback) => deferred.push(callback) });
  const event = { preventDefault: vi.fn() };
  return { restart, requestQuit, install, deferred, event };
}

describe('update restart document guards', () => {
  it('requests an ordinary guarded quit without starting the installer', () => {
    const { restart, requestQuit, install } = setup();
    restart.request();
    restart.request();
    expect(requestQuit).toHaveBeenCalledOnce();
    expect(install).not.toHaveBeenCalled();
  });

  it('allows cancellation or a failed save without entering the native updater', () => {
    const { restart, install, event } = setup();
    restart.request();
    restart.cancel();
    restart.onWillQuit(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  it('hands off exactly once after window guards finish and the quit callback unwinds', () => {
    const { restart, install, deferred, event } = setup();
    restart.request();
    restart.onWillQuit(event);
    restart.onWillQuit(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(install).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(1);
    deferred[0]();
    expect(install).toHaveBeenCalledOnce();
    const nativeQuit = { preventDefault: vi.fn() };
    restart.onWillQuit(nativeQuit);
    expect(nativeQuit.preventDefault).not.toHaveBeenCalled();
  });

  it('supports Cancel then retry without registering native update observers twice', () => {
    const { restart, requestQuit, install, deferred, event } = setup();
    restart.request();
    restart.cancel();
    restart.request();
    restart.onWillQuit(event);
    deferred[0]();
    expect(requestQuit).toHaveBeenCalledTimes(2);
    expect(install).toHaveBeenCalledOnce();
  });

  it('invalidates a queued handoff when cancellation arrives before installation', () => {
    const { restart, install, deferred, event } = setup();
    restart.request();
    restart.onWillQuit(event);
    restart.cancel();
    deferred[0]();
    expect(install).not.toHaveBeenCalled();
  });

  it('leaves ordinary application quits unchanged', () => {
    const { restart, install, event, deferred } = setup();
    restart.onWillQuit(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(0);
  });
});
