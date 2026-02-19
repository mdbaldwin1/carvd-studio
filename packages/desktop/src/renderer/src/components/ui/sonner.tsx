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
      richColors
      duration={2000}
      toastOptions={{
        className: 'text-[13px] font-medium',
      }}
    />
  );
}

export { Toaster };
