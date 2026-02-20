import { useLicenseStore } from '../../store/licenseStore';
import { Assembly, Stock } from '../../types';
import { getFeatureLimits } from '../../utils/featureLimits';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[750px] h-[500px]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Library</DialogTitle>
          <DialogClose onClose={onClose} />
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
