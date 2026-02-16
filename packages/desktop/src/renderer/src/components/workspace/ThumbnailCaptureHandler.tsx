import { useThree } from '@react-three/fiber';
import { useCallback, useEffect } from 'react';
import { registerThumbnailGenerator, unregisterThumbnailGenerator } from '../../store/projectStore';

// Thumbnail dimensions for project preview
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

// Component that handles thumbnail generation for project saves
export function ThumbnailCaptureHandler() {
  const { gl, scene, camera } = useThree();

  const generateThumbnail = useCallback(async (): Promise<string | null> => {
    try {
      // Store original canvas size
      const originalWidth = gl.domElement.width;
      const originalHeight = gl.domElement.height;

      // Create an off-screen canvas for thumbnail
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = THUMBNAIL_WIDTH;
      offscreenCanvas.height = THUMBNAIL_HEIGHT;
      const ctx = offscreenCanvas.getContext('2d');

      if (!ctx) {
        return null;
      }

      // Render the scene at current size
      gl.render(scene, camera);

      // Draw the WebGL canvas onto the offscreen canvas, scaling it down
      ctx.drawImage(gl.domElement, 0, 0, originalWidth, originalHeight, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

      // Convert to base64 PNG (without the data:image/png;base64, prefix)
      const dataUrl = offscreenCanvas.toDataURL('image/png', 0.8);
      const base64Data = dataUrl.split(',')[1];

      return base64Data;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }, [gl, scene, camera]);

  // Register the thumbnail generator on mount
  useEffect(() => {
    registerThumbnailGenerator(generateThumbnail);
    return () => unregisterThumbnailGenerator();
  }, [generateThumbnail]);

  return null;
}
