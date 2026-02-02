import { useProjectStore } from '../store/projectStore';

export function Toast() {
  const toast = useProjectStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div className="toast">
      {toast.message}
    </div>
  );
}
