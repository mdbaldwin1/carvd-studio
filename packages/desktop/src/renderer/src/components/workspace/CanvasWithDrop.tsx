import { Canvas } from '@react-three/fiber';
import { HotkeyHints } from '@renderer/components/common/HotkeyHints';
import { DisplayToolbar } from '@renderer/components/layout/DisplayToolbar';
import { useAppSettings } from '@renderer/hooks/useAppSettings';
import { useAssemblyLibrary } from '@renderer/hooks/useAssemblyLibrary';
import { useStockLibrary } from '@renderer/hooks/useStockLibrary';
import { useProjectStore } from '@renderer/store/projectStore';
import { useState } from 'react';
import { Workspace } from './Workspace';

export function CanvasWithDrop() {
  const partsCount = useProjectStore((s) => s.parts.length);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropType, setDropType] = useState<'stock' | 'assembly' | null>(null);
  const { settings: appSettings } = useAppSettings();
  const { assemblies: assemblyLibrary } = useAssemblyLibrary();
  const { stocks: stockLibrary } = useStockLibrary();
  const isMac = window.navigator.userAgent.toUpperCase().includes('MAC');
  const modKey = isMac ? '⌘' : 'Ctrl';

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/carvd-stock')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
      setDropType('stock');
    } else if (e.dataTransfer.types.includes('application/carvd-assembly')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
      setDropType('assembly');
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setDropType(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropType(null);

    const projectState = useProjectStore.getState();
    const { stocks: projectStocks, parts, assemblies } = projectState;

    const stockId = e.dataTransfer.getData('application/carvd-stock');
    if (stockId) {
      let stock = projectStocks.find((s) => s.id === stockId);
      if (!stock) {
        stock = stockLibrary.find((s) => s.id === stockId);
      }
      if (!stock) return;

      const existingNumbers = parts
        .map((p) => {
          const match = p.name.match(/^Part (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => n > 0);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      projectState.addPart({
        name: `Part ${nextNumber}`,
        length: stock.length,
        width: stock.width,
        thickness: stock.thickness,
        position: {
          x: (parts.length % 5) * 6,
          y: stock.thickness / 2,
          z: Math.floor(parts.length / 5) * 6
        },
        stockId: stock.id,
        color: stock.color,
        grainDirection: stock.grainDirection === 'none' ? 'length' : stock.grainDirection,
        grainSensitive: stock.grainDirection !== 'none'
      });
      return;
    }

    const assemblyId = e.dataTransfer.getData('application/carvd-assembly');
    if (assemblyId) {
      const source = e.dataTransfer.getData('application/carvd-assembly-source');

      let assembly = assemblies.find((c) => c.id === assemblyId);

      if (!assembly && source === 'library') {
        assembly = assemblyLibrary.find((c) => c.id === assemblyId);
        if (assembly) {
          projectState.addAssembly(assembly);
        }
      }

      if (!assembly) return;

      const position = {
        x: (parts.length % 5) * 6,
        y: 0,
        z: Math.floor(parts.length / 5) * 6
      };

      projectState.placeAssembly(assembly.id, position, stockLibrary);
    }
  };

  return (
    <div
      className={`canvas-container relative min-w-0 flex-1 overflow-hidden bg-bg ${isDragOver ? 'outline-2 outline-dashed outline-accent -outline-offset-2' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Canvas
        camera={{ position: [60, 50, 60], fov: 50, far: 5000 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false
        }}
      >
        <Workspace />
      </Canvas>
      <DisplayToolbar />
      <HotkeyHints show={appSettings.showHotkeyHints} />
      {appSettings.showHotkeyHints && (
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 py-2 px-2.5 bg-surface opacity-70 hover:opacity-95 border border-border rounded-md backdrop-blur-[4px] z-50 pointer-events-none [&_kbd]:inline-block [&_kbd]:min-w-10 [&_kbd]:py-px [&_kbd]:px-1 [&_kbd]:bg-bg [&_kbd]:border [&_kbd]:border-border [&_kbd]:rounded-sm [&_kbd]:font-mono [&_kbd]:text-[9px] [&_kbd]:text-text [&_kbd]:text-center">
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>LMB</kbd> Orbit
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>RMB</kbd> Pan
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>Scroll</kbd> Zoom
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>Home</kbd> Reset View
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>F</kbd> Focus
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>{modKey}+Z</kbd> Undo
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>{modKey}+Shift+Z</kbd> Redo
          </div>
        </div>
      )}
      {isDragOver && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground py-4 px-8 rounded-lg text-base font-medium pointer-events-none z-[100]">
          <span>{dropType === 'assembly' ? 'Drop to place assembly' : 'Drop to create part'}</span>
        </div>
      )}
      {partsCount === 0 && (
        <div className="empty-state-overlay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 text-center">
          <div className="bg-bg border border-border rounded-lg py-8 px-10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="text-5xl mb-4">🛠️</div>
            <h2 className="text-xl font-semibold text-text m-0 mb-2">Start Building</h2>
            <p className="text-sm text-text-muted m-0 mb-5 max-w-80 leading-relaxed">
              Add parts to your design to get started. You can create parts from the sidebar or drag stock materials
              onto the canvas.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <kbd className="bg-bg-dark border border-border rounded-sm py-0.5 px-2 font-sans text-xs text-text">
                  P
                </kbd>
                <span>Add new part</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <span className="text-xs text-text-muted">Drag stock →</span>
                <span>Create part from stock</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
