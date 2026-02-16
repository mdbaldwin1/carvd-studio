import { useProjectStore } from '../../store/projectStore';

export function Toast() {
  const toast = useProjectStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div className="fixed bottom-[60px] left-1/2 z-[200] rounded-md bg-accent px-5 py-2.5 text-[13px] font-medium text-bg-dark shadow-[0_4px_12px_var(--color-overlay)] animate-toast-in">
      {toast.message}
    </div>
  );
}
