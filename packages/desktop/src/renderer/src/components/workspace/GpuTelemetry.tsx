import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

// Log GPU renderer info on mount - uses a short delay so logs are visible
// even if DevTools is opened after the app loads in production
export function GpuTelemetry() {
  const { gl } = useThree();

  useEffect(() => {
    const logGpuInfo = () => {
      const glCtx = gl.getContext();
      const dbg = glCtx.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const vendor = glCtx.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
        const renderer = glCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        console.info(`[GPU] Vendor: ${vendor}  Renderer: ${renderer}`);
      }
      console.info(
        `[GPU] Drawing buffer: ${gl.domElement.width}x${gl.domElement.height}  Pixel ratio: ${gl.getPixelRatio()}`
      );
    };

    // Log immediately
    logGpuInfo();
    // Also log after a short delay in case DevTools is opened late
    const timer = setTimeout(logGpuInfo, 3000);
    return () => clearTimeout(timer);
  }, [gl]);

  return null;
}
