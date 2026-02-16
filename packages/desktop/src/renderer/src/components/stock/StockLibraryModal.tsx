import { useState } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore } from '../../store/projectStore';
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
  const licenseMode = useProjectStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canCreateAssemblies = limits.canUseAssemblies;
  const [activeTab, setActiveTab] = useState<LibraryTab>('stocks');

  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal stock-library-modal" role="dialog" aria-modal="true" aria-labelledby="library-modal-title">
        <div className="modal-header">
          <h2 id="library-modal-title">Library</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className="library-tabs">
          <button
            className={`library-tab ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            Stocks ({stocks.length})
          </button>
          <button
            className={`library-tab ${activeTab === 'assemblies' ? 'active' : ''}`}
            onClick={() => setActiveTab('assemblies')}
          >
            Assemblies ({assemblies.length})
          </button>
        </div>

        {/* Upgrade banner for free mode users - shown above assemblies tab content */}
        {activeTab === 'assemblies' && !canCreateAssemblies && (
          <div className="upgrade-banner">
            <span>Upgrade to create and edit assemblies</span>
          </div>
        )}

        <div className="stock-library-content">
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

        <div className="modal-footer">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
