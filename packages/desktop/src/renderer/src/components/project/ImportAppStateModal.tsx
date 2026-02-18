import { useState, useCallback, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, Package, Palette, FileBox, LayoutTemplate } from 'lucide-react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useUIStore } from '../../store/uiStore';

interface ImportPreview {
  valid: boolean;
  errors: string[];
  counts: {
    templates: number;
    assemblies: number;
    stocks: number;
    colors: number;
  };
  duplicates: {
    templates: string[];
    assemblies: string[];
    stocks: string[];
  };
}

interface ImportAppStateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'select' | 'options' | 'result';

export function ImportAppStateModal({ isOpen, onClose }: ImportAppStateModalProps) {
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);
  const showToast = useUIStore((s) => s.showToast);

  const [step, setStep] = useState<ImportStep>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Import options
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'replace'>('merge');
  const [includeTemplates, setIncludeTemplates] = useState(true);
  const [includeAssemblies, setIncludeAssemblies] = useState(true);
  const [includeStocks, setIncludeStocks] = useState(true);
  const [includeColors, setIncludeColors] = useState(true);

  // Import result
  const [importResult, setImportResult] = useState<{
    imported: { templates: number; assemblies: number; stocks: number; colors: number };
    skipped: { templates: number; assemblies: number; stocks: number };
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setFilePath(null);
      setPreview(null);
      setError(null);
      setMergeStrategy('merge');
      setIncludeTemplates(true);
      setIncludeAssemblies(true);
      setIncludeStocks(true);
      setIncludeColors(true);
      setImportResult(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectFile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.previewImportAppState();
      if (result.canceled) {
        setIsLoading(false);
        return;
      }
      if (!result.success) {
        setError(result.error || result.errors?.join(', ') || 'Failed to read backup file');
        setIsLoading(false);
        return;
      }
      setFilePath(result.filePath || null);
      setPreview(result.preview || null);
      setStep('options');
    } catch {
      setError('Failed to read backup file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!filePath) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.importAppState(filePath, {
        mergeStrategy,
        includeTemplates,
        includeAssemblies,
        includeStocks,
        includeColors
      });

      if (!result.success) {
        setError(result.errors?.join(', ') || 'Import failed');
        setIsLoading(false);
        return;
      }

      setImportResult({
        imported: result.imported,
        skipped: result.skipped
      });
      setStep('result');
    } catch {
      setError('Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [filePath, mergeStrategy, includeTemplates, includeAssemblies, includeStocks, includeColors]);

  const handleDone = useCallback(() => {
    if (importResult) {
      const total =
        importResult.imported.templates +
        importResult.imported.assemblies +
        importResult.imported.stocks +
        importResult.imported.colors;
      if (total > 0) {
        showToast(`Successfully imported ${total} items`, 'success');
      }
    }
    onClose();
  }, [importResult, showToast, onClose]);

  if (!isOpen) return null;

  const totalItems = preview
    ? preview.counts.templates + preview.counts.assemblies + preview.counts.stocks + preview.counts.colors
    : 0;

  const totalDuplicates = preview
    ? preview.duplicates.templates.length + preview.duplicates.assemblies.length + preview.duplicates.stocks.length
    : 0;

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in w-[480px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-app-state-modal-title"
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="import-app-state-modal-title" className="text-base font-semibold text-text m-0">
            Import App State
          </h2>
          <button
            className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-6 min-h-[300px]">
          {step === 'select' && (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="text-text-muted mb-4">
                <Upload size={48} />
              </div>
              <p className="text-sm text-text-secondary m-0 mb-6 leading-relaxed">
                Import templates, assemblies, stock materials, and custom colors from a Carvd backup file.
              </p>
              {error && (
                <div className="p-4 rounded-lg flex items-start gap-3 bg-error-bg border border-error-border">
                  <AlertTriangle size={16} className="text-error shrink-0" />
                  <span className="text-[13px] text-text-secondary leading-relaxed">{error}</span>
                </div>
              )}
              <button className="btn btn-md btn-filled btn-primary" onClick={handleSelectFile} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Select Backup File'}
              </button>
            </div>
          )}

          {step === 'options' && preview && (
            <div>
              <div className="mb-6">
                <h3 className="text-[13px] font-semibold text-text m-0 mb-3">Backup Contents</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                    <LayoutTemplate size={20} className="text-text-muted shrink-0" />
                    <span className="text-lg font-semibold text-text">{preview.counts.templates}</span>
                    <span className="text-xs text-text-secondary">Templates</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                    <Package size={20} className="text-text-muted shrink-0" />
                    <span className="text-lg font-semibold text-text">{preview.counts.assemblies}</span>
                    <span className="text-xs text-text-secondary">Assemblies</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                    <FileBox size={20} className="text-text-muted shrink-0" />
                    <span className="text-lg font-semibold text-text">{preview.counts.stocks}</span>
                    <span className="text-xs text-text-secondary">Stock Materials</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                    <Palette size={20} className="text-text-muted shrink-0" />
                    <span className="text-lg font-semibold text-text">{preview.counts.colors}</span>
                    <span className="text-xs text-text-secondary">Custom Colors</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-[13px] font-semibold text-text m-0 mb-3">What to Import</h3>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded-md cursor-pointer text-[13px] text-text hover:border-border-hover">
                    <input
                      type="checkbox"
                      checked={includeTemplates}
                      onChange={(e) => setIncludeTemplates(e.target.checked)}
                      disabled={preview.counts.templates === 0}
                      className="w-4 h-4 accent-accent disabled:opacity-50"
                    />
                    <span className="disabled:opacity-50">Templates ({preview.counts.templates})</span>
                    {preview.duplicates.templates.length > 0 && (
                      <span className="ml-auto text-[11px] text-warning bg-warning-bg py-0.5 px-1.5 rounded">
                        {preview.duplicates.templates.length} existing
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded-md cursor-pointer text-[13px] text-text hover:border-border-hover">
                    <input
                      type="checkbox"
                      checked={includeAssemblies}
                      onChange={(e) => setIncludeAssemblies(e.target.checked)}
                      disabled={preview.counts.assemblies === 0}
                      className="w-4 h-4 accent-accent disabled:opacity-50"
                    />
                    <span>Assemblies ({preview.counts.assemblies})</span>
                    {preview.duplicates.assemblies.length > 0 && (
                      <span className="ml-auto text-[11px] text-warning bg-warning-bg py-0.5 px-1.5 rounded">
                        {preview.duplicates.assemblies.length} existing
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded-md cursor-pointer text-[13px] text-text hover:border-border-hover">
                    <input
                      type="checkbox"
                      checked={includeStocks}
                      onChange={(e) => setIncludeStocks(e.target.checked)}
                      disabled={preview.counts.stocks === 0}
                      className="w-4 h-4 accent-accent disabled:opacity-50"
                    />
                    <span>Stock Materials ({preview.counts.stocks})</span>
                    {preview.duplicates.stocks.length > 0 && (
                      <span className="ml-auto text-[11px] text-warning bg-warning-bg py-0.5 px-1.5 rounded">
                        {preview.duplicates.stocks.length} existing
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded-md cursor-pointer text-[13px] text-text hover:border-border-hover">
                    <input
                      type="checkbox"
                      checked={includeColors}
                      onChange={(e) => setIncludeColors(e.target.checked)}
                      disabled={preview.counts.colors === 0}
                      className="w-4 h-4 accent-accent disabled:opacity-50"
                    />
                    <span>Custom Colors ({preview.counts.colors})</span>
                  </label>
                </div>
              </div>

              {totalDuplicates > 0 && (
                <div className="mb-6">
                  <h3 className="text-[13px] font-semibold text-text m-0 mb-3">Duplicate Handling</h3>
                  <p className="text-xs text-text-muted m-0 mb-3">
                    {totalDuplicates} item{totalDuplicates !== 1 ? 's' : ''} already exist in your library.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-3 p-3 bg-bg border border-border rounded-md cursor-pointer hover:border-border-hover">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value="merge"
                        checked={mergeStrategy === 'merge'}
                        onChange={() => setMergeStrategy('merge')}
                        className="w-4 h-4 mt-0.5 accent-accent"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-text">Keep existing (recommended)</span>
                        <span className="text-xs text-text-muted">Skip items that already exist in your library</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 bg-bg border border-border rounded-md cursor-pointer hover:border-border-hover">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value="replace"
                        checked={mergeStrategy === 'replace'}
                        onChange={() => setMergeStrategy('replace')}
                        className="w-4 h-4 mt-0.5 accent-accent"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-text">Replace all</span>
                        <span className="text-xs text-text-muted">
                          Remove your existing items and import all from backup
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg flex items-start gap-3 bg-error-bg border border-error-border">
                  <AlertTriangle size={16} className="text-error shrink-0" />
                  <span className="text-[13px] text-text-secondary leading-relaxed">{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="flex flex-col items-center text-center p-6">
              <div className="text-success mb-4">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-lg font-semibold text-text m-0 mb-6">Import Complete</h3>
              <div className="flex flex-col gap-2 w-full text-left">
                {importResult.imported.templates > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-success-bg rounded-md text-[13px] text-text">
                    <LayoutTemplate size={16} className="text-success" />
                    <span>{importResult.imported.templates} templates imported</span>
                  </div>
                )}
                {importResult.imported.assemblies > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-success-bg rounded-md text-[13px] text-text">
                    <Package size={16} className="text-success" />
                    <span>{importResult.imported.assemblies} assemblies imported</span>
                  </div>
                )}
                {importResult.imported.stocks > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-success-bg rounded-md text-[13px] text-text">
                    <FileBox size={16} className="text-success" />
                    <span>{importResult.imported.stocks} stock materials imported</span>
                  </div>
                )}
                {importResult.imported.colors > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-success-bg rounded-md text-[13px] text-text">
                    <Palette size={16} className="text-success" />
                    <span>{importResult.imported.colors} custom colors imported</span>
                  </div>
                )}
                {importResult.skipped.templates + importResult.skipped.assemblies + importResult.skipped.stocks > 0 && (
                  <div className="flex flex-wrap gap-2 py-2 px-3 bg-bg border border-border rounded-md text-xs text-text-muted mt-2">
                    <span className="font-medium mr-1">Skipped (already exist):</span>
                    {importResult.skipped.templates > 0 && <span>{importResult.skipped.templates} templates</span>}
                    {importResult.skipped.assemblies > 0 && <span>{importResult.skipped.assemblies} assemblies</span>}
                    {importResult.skipped.stocks > 0 && <span>{importResult.skipped.stocks} stock materials</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          {step === 'select' && (
            <button className="btn btn-sm btn-outlined btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          {step === 'options' && (
            <>
              <button
                className="btn btn-sm btn-outlined btn-secondary"
                onClick={() => setStep('select')}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                className="btn btn-sm btn-filled btn-primary"
                onClick={handleImport}
                disabled={
                  isLoading ||
                  (!includeTemplates && !includeAssemblies && !includeStocks && !includeColors) ||
                  totalItems === 0
                }
              >
                {isLoading ? 'Importing...' : 'Import'}
              </button>
            </>
          )}
          {step === 'result' && (
            <button className="btn btn-sm btn-filled btn-primary" onClick={handleDone}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
