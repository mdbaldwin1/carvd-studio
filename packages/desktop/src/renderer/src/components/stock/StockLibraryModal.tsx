import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { BookOpen, Box, Cuboid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLicenseStore } from '../../store/licenseStore';
import { Assembly, Stock } from '../../types';
import { getFeatureLimits } from '../../utils/featureLimits';
import { getDocsUrl } from '../../utils/docsLinks';
import { AssembliesTab } from './AssembliesTab';
import { StocksTab } from './StocksTab';

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

interface LibraryFooterFormState {
  isFormMode: boolean;
  confirmLabel?: 'Save' | 'Create';
  canConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
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
  const [activeSection, setActiveSection] = useState<'stocks' | 'assemblies'>('stocks');
  const [stocksFooterState, setStocksFooterState] = useState<LibraryFooterFormState>({ isFormMode: false });
  const [assembliesFooterState, setAssembliesFooterState] = useState<LibraryFooterFormState>({ isFormMode: false });

  useEffect(() => {
    if (!isOpen) {
      setActiveSection('stocks');
      setStocksFooterState({ isFormMode: false });
      setAssembliesFooterState({ isFormMode: false });
    }
  }, [isOpen]);

  const activeFooterState = activeSection === 'stocks' ? stocksFooterState : assembliesFooterState;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[1140px] max-w-[96vw] h-[82vh] max-h-[90vh]" onClose={onClose}>
        <DialogHeader>
          <div className="flex w-full items-start justify-between gap-6">
            <div>
              <DialogTitle>App Library</DialogTitle>
              <p className="mt-1 text-sm text-text-muted">
                Manage reusable stock materials and assemblies used across all projects.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() =>
                  window.electronAPI.openExternal(getDocsUrl(activeSection === 'stocks' ? 'stock' : 'assemblies'))
                }
                title={activeSection === 'stocks' ? 'View stock docs' : 'View assembly docs'}
              >
                <BookOpen size={12} />
                Docs
              </Button>
              <DialogClose onClose={onClose} />
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeSection}
          onValueChange={(v) => setActiveSection(v as 'stocks' | 'assemblies')}
          className="flex flex-1 min-h-0 flex-col overflow-hidden"
        >
          <div className="mx-5 mb-3 mt-3 flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="stocks" className="gap-2">
                <Box size={14} />
                Stocks
                <Badge variant="secondary">{stocks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="assemblies" className="gap-2">
                <Cuboid size={14} />
                Assemblies
                <Badge variant="secondary">{assemblies.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {!canCreateAssemblies && (
              <div className="rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] text-text-muted">
                Upgrade to create and edit assemblies.
              </div>
            )}
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-surface">
            <TabsContent value="stocks" className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full min-h-0 overflow-hidden">
                <StocksTab
                  stocks={stocks}
                  onAddStock={onAddStock}
                  onUpdateStock={onUpdateStock}
                  onDeleteStock={onDeleteStock}
                  onClose={onClose}
                  hideInlineFormActions
                  onFormModeChange={setStocksFooterState}
                />
              </div>
            </TabsContent>

            <TabsContent value="assemblies" className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full min-h-0 overflow-hidden">
                <AssembliesTab
                  assemblies={assemblies}
                  onUpdateAssembly={onUpdateAssembly}
                  onDeleteAssembly={onDeleteAssembly}
                  onDuplicateAssembly={onDuplicateAssembly}
                  onEditAssemblyIn3D={onEditAssemblyIn3D}
                  onCreateNewAssembly={onCreateNewAssembly}
                  canCreateAssemblies={canCreateAssemblies}
                  onClose={onClose}
                  hideInlineFormActions
                  onFormModeChange={setAssembliesFooterState}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          {activeFooterState.isFormMode ? (
            <>
              <Button variant="outline" size="sm" onClick={activeFooterState.onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={activeFooterState.onConfirm} disabled={!activeFooterState.canConfirm}>
                {activeFooterState.confirmLabel ?? 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
