import { Toaster as SonnerToaster } from 'sonner';
import { useAppSettingsStore } from '../../store/appSettingsStore';

/**
 * Themed toast notification container powered by Sonner.
 *
 * Reads the current theme from {@link useAppSettingsStore} and passes it
 * through. Trigger toasts via `useUIStore.getState().showToast(message, type?)`.
 */
function Toaster() {
  const theme = useAppSettingsStore((s) => s.theme) as 'dark' | 'light';

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      offset={60}
      duration={2000}
      closeButton
      toastOptions={{
        className: 'carvd-toast text-[13px] font-medium',
        classNames: {
          toast: 'carvd-toast',
          title: 'text-[13px] font-semibold text-text',
          description: 'text-[12px] text-text-muted',
          actionButton:
            'carvd-toast-action !border !border-primary/40 !bg-primary/20 !text-primary !hover:bg-primary/30 !font-medium',
          cancelButton:
            'carvd-toast-cancel !border !border-border !bg-surface-hover !text-text !hover:bg-bg-hover !font-medium'
        }
      }}
    />
  );
}

export { Toaster };
