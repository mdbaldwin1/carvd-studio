import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useLicenseStore } from '../../store/licenseStore';
import { Assembly, Stock } from '../../types';
import { getFeatureLimits } from '../../utils/featureLimits';
import { Button } from '@renderer/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import { StocksTab } from './StocksTab';
import { AssembliesTab } from './AssembliesTab';

interface StockLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  onAddStock: (stock: Stock) => void;
  onUpdateStock: (id: string, updates: Partial<Stock>) => void;
  onDeleteStock: (id: string) => void;
  assemblies: Assembly[];
  onUpdateAssembly: (id: string, updates: Partial<Assembly>) => void;
  onDeleteAssembly: (id: string) => void;
  onDuplicateAssembly?: (assembly: Assembly) => Promise<void>;
  onEditAssemblyIn3D?: (assembly: Assembly) => Promise<boolean>;
  onCreateNewAssembly?: () => Promise<boolean>;
}

export function StockLibraryModal({
  isOpen,
  onClose,
  stocks,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  assemblies,
  onUpdateAssembly,
  onDeleteAssembly,
  onDuplicateAssembly,
  onEditAssemblyIn3D,
  onCreateNewAssembly
}: StockLibraryModalProps) {
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canCreateAssemblies = limits.canUseAssemblies;
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in w-[750px] h-[500px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-modal-title"
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="library-modal-title" className="text-base font-semibold text-text m-0">
            Library
          </h2>
          <button
            className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Tab bar + content */}
        <Tabs defaultValue="stocks" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="px-0 bg-transparent border-b border-border">
            <TabsTrigger value="stocks" className="flex-1 py-3 px-4 font-medium hover:bg-surface-hover">
              Stocks ({stocks.length})
            </TabsTrigger>
            <TabsTrigger value="assemblies" className="flex-1 py-3 px-4 font-medium hover:bg-surface-hover">
              Assemblies ({assemblies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stocks" className="flex flex-1 overflow-hidden">
            <StocksTab
              stocks={stocks}
              onAddStock={onAddStock}
              onUpdateStock={onUpdateStock}
              onDeleteStock={onDeleteStock}
              onClose={onClose}
            />
          </TabsContent>
          <TabsContent value="assemblies" className="flex-col">
            {/* Upgrade banner for free mode users */}
            {!canCreateAssemblies && (
              <div className="py-2.5 px-4 bg-bg-tertiary border-b border-border text-xs text-text-secondary text-center">
                <span>Upgrade to create and edit assemblies</span>
              </div>
            )}
            <div className="flex flex-1 overflow-hidden">
              <AssembliesTab
                assemblies={assemblies}
                onUpdateAssembly={onUpdateAssembly}
                onDeleteAssembly={onDeleteAssembly}
                onDuplicateAssembly={onDuplicateAssembly}
                onEditAssemblyIn3D={onEditAssemblyIn3D}
                onCreateNewAssembly={onCreateNewAssembly}
                canCreateAssemblies={canCreateAssemblies}
                onClose={onClose}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
