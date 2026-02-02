import { useCallback, useRef } from 'react';

/**
 * Hook for handling modal backdrop clicks properly.
 * Only closes the modal if BOTH mousedown AND mouseup happened on the backdrop.
 * This prevents accidental closes when dragging to select text in inputs.
 */
export function useBackdropClose(onClose: () => void) {
  const mouseDownOnBackdrop = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only track if mousedown is directly on the backdrop (not on modal content)
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if both mousedown and click (mouseup) happened on the backdrop
      if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
        onClose();
      }
      // Reset the flag
      mouseDownOnBackdrop.current = false;
    },
    [onClose]
  );

  return { handleMouseDown, handleClick };
}
