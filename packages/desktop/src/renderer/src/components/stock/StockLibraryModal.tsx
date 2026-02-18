import { useState } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useLicenseStore } from '../../store/licenseStore';
import { Assembly, Stock } from '../../types';
import { getFeatureLimits } from '../../utils/featureLimits';
import { StocksTab } from './StocksTab';
import { AssembliesTab } from './AssembliesTab';

type LibraryTab = 'stocks' | 'assemblies';

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
  const [activeTab, setActiveTab] = useState<LibraryTab>('stocks');

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

        {/* Tab bar */}
        <div className="flex border-b border-border">
          <button
            className={`flex-1 py-3 px-4 bg-transparent border-none border-b-2 border-b-transparent text-text-muted text-[13px] font-medium cursor-pointer transition-all duration-150 hover:text-text hover:bg-surface-hover ${activeTab === 'stocks' ? '!text-accent !border-b-accent' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            Stocks ({stocks.length})
          </button>
          <button
            className={`flex-1 py-3 px-4 bg-transparent border-none border-b-2 border-b-transparent text-text-muted text-[13px] font-medium cursor-pointer transition-all duration-150 hover:text-text hover:bg-surface-hover ${activeTab === 'assemblies' ? '!text-accent !border-b-accent' : ''}`}
            onClick={() => setActiveTab('assemblies')}
          >
            Assemblies ({assemblies.length})
          </button>
        </div>

        {/* Upgrade banner for free mode users - shown above assemblies tab content */}
        {activeTab === 'assemblies' && !canCreateAssemblies && (
          <div className="py-2.5 px-4 bg-bg-tertiary border-b border-border text-xs text-text-secondary text-center">
            <span>Upgrade to create and edit assemblies</span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {activeTab === 'stocks' ? (
            <StocksTab
              stocks={stocks}
              onAddStock={onAddStock}
              onUpdateStock={onUpdateStock}
              onDeleteStock={onDeleteStock}
              onClose={onClose}
            />
          ) : (
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
          )}
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
