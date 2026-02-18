import { useProjectStore } from '../../store/projectStore';

/**
 * Notification toast rendered at the bottom of the viewport.
 *
 * Reads toast state from the project store. Trigger via
 * `useProjectStore.getState().showToast(message)`.
 */
export function Toast() {
  const toast = useProjectStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div className="fixed bottom-[60px] left-1/2 z-[200] rounded-md bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-foreground shadow-[0_4px_12px_var(--color-overlay)] animate-toast-in">
      {toast.message}
    </div>
  );
}
