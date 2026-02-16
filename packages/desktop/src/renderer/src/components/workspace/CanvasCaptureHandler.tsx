import { useThree } from '@react-three/fiber';
import { useCallback, useEffect } from 'react';
import { useProjectStore, registerCanvasCaptureHandler, unregisterCanvasCaptureHandler } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';

// Component that handles canvas capture/export
export function CanvasCaptureHandler() {
  const { gl, scene, camera } = useThree();
  const projectName = useProjectStore((s) => s.projectName);

  const captureCanvas = useCallback(async () => {
    // Render the scene to ensure we capture current state
    gl.render(scene, camera);

    // Show save dialog first to get the file path and determine format
    const sanitizedName = (projectName || 'project').replace(/[^a-zA-Z0-9-_]/g, '-');
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `${sanitizedName}.png`,
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    // Determine format based on file extension
    const isJpeg = result.filePath.toLowerCase().endsWith('.jpg') || result.filePath.toLowerCase().endsWith('.jpeg');
    const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

    // Get the canvas data as a data URL
    const dataUrl = gl.domElement.toDataURL(mimeType, isJpeg ? 0.95 : undefined);

    // Convert data URL to Uint8Array without using fetch (CSP compliant)
    const base64Data = dataUrl.split(',')[1];
    const binaryString = atob(base64Data);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Write the image file
    await window.electronAPI.writeBinaryFile(result.filePath, Array.from(uint8Array));
    useUIStore.getState().showToast(`Exported to ${result.filePath.split('/').pop()}`);
  }, [gl, scene, camera, projectName]);

  // Register the capture handler on mount
  useEffect(() => {
    registerCanvasCaptureHandler(captureCanvas);
    return () => unregisterCanvasCaptureHandler();
  }, [captureCanvas]);

  return null;
}
