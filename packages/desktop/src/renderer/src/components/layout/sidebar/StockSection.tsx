import { Button } from '@renderer/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible';
import { SidebarGroup, SidebarGroupLabel } from '@renderer/components/ui/sidebar';
import { Part, Stock } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';

interface StockSectionProps {
  isCollapsed: boolean;
  onOpenChange: (open: boolean) => void;
  searchOpen: boolean;
  searchTerm: string;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  isEditingAssembly: boolean;
  stocks: Stock[];
  parts: Part[];
  selectedStockId: string | null;
  units: 'imperial' | 'metric';
  onOpenCreateStock: () => void;
  onOpenAddStock: () => void;
  onEditStock: (stock: Stock) => void;
  onDeleteStock: (stock: Stock) => void;
  onSelectStock: (stockId: string) => void;
}

export function StockSection({
  isCollapsed,
  onOpenChange,
  searchOpen,
  searchTerm,
  onToggleSearch,
  onSearchChange,
  isEditingAssembly,
  stocks,
  parts,
  selectedStockId,
  units,
  onOpenCreateStock,
  onOpenAddStock,
  onEditStock,
  onDeleteStock,
  onSelectStock
}: StockSectionProps) {
  return (
    <Collapsible asChild open={!isCollapsed} onOpenChange={onOpenChange}>
      <SidebarGroup className={isCollapsed ? 'flex-none' : 'flex-1'}>
        <CollapsibleTrigger asChild>
          <div
            className="flex cursor-pointer items-center gap-1.5 rounded-none p-4 pr-2.5 transition-[background-color,margin] duration-150 hover:bg-bg-hover"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-text-muted transition-colors duration-150">
              {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
            </span>
            <SidebarGroupLabel>{isEditingAssembly ? 'Stock Library' : 'Stock'}</SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              active={searchOpen}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSearch();
              }}
              title="Search"
              disabled={stocks.length === 0}
            >
              <Search size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (isEditingAssembly) {
                  onOpenCreateStock();
                } else {
                  onOpenAddStock();
                }
              }}
              title={isEditingAssembly ? 'Add New Stock to Library' : 'Add Stock from Library'}
            >
              +
            </Button>
          </div>
        </CollapsibleTrigger>
        {searchOpen && (
          <div className="flex items-center px-2 py-2">
            <div className="sticky top-0 z-[1] flex flex-1 items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 transition-colors focus-within:border-accent">
              <Search size={12} className="text-text-muted" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus-visible:outline-none"
                type="text"
                placeholder="Search stock..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchTerm && (
                <button
                  className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-text-muted hover:bg-bg-hover hover:text-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchChange('');
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}
        <CollapsibleContent
          forceMount
          className="min-h-0 flex-1 overflow-hidden data-[state=open]:flex data-[state=open]:flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {stocks.length === 0 ? (
              <p className="text-text-muted text-xs italic px-4">
                {isEditingAssembly ? 'No stock in library. Click + to create.' : 'No stock yet. Click + to add.'}
              </p>
            ) : (
              <ul className="stock-list list-none my-0 flex-1 overflow-y-auto min-h-0">
                {stocks
                  .filter((stock) => !searchTerm || stock.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((stock) => {
                    const partCount = parts.filter((p) => p.stockId === stock.id).length;
                    return (
                      <li
                        key={stock.id}
                        className={`group/stock flex cursor-grab items-center gap-2 py-2 px-3 transition-colors duration-100 select-none hover:bg-surface-hover active:cursor-grabbing ${selectedStockId === stock.id ? 'bg-selected' : ''}`}
                        draggable
                        onClick={() => onSelectStock(stock.id)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/carvd-stock', stock.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        title={`Drag onto canvas to create part\n${formatMeasurementWithUnit(stock.length, units)} × ${formatMeasurementWithUnit(stock.width, units)} × ${formatMeasurementWithUnit(stock.thickness, units)}${!isEditingAssembly ? `\n${partCount} part${partCount !== 1 ? 's' : ''} assigned` : ''}`}
                      >
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: stock.color }} />
                        <span className="flex-1 text-xs truncate">{stock.name}</span>
                        {!isEditingAssembly && partCount > 0 && (
                          <span className="text-[10px] bg-border text-text py-px px-1.5 rounded-full min-w-4 text-center">
                            {partCount}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted">
                          {formatMeasurementWithUnit(stock.thickness, units)}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover/stock:opacity-100 transition-opacity duration-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStock(stock);
                            }}
                            title={isEditingAssembly ? 'Edit library stock' : 'Edit stock'}
                          >
                            ✎
                          </Button>
                          <Button
                            variant="destructiveGhost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteStock(stock);
                            }}
                            title={isEditingAssembly ? 'Delete from library' : 'Remove from project'}
                          >
                            ×
                          </Button>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
