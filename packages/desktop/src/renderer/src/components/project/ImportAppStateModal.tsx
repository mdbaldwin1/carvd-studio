import { useState, useCallback, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, Package, Palette, FileBox, LayoutTemplate } from 'lucide-react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore } from '../../store/projectStore';

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
  const showToast = useProjectStore((s) => s.showToast);

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
    } catch (err) {
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
    } catch (err) {
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
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div
        className="modal import-app-state-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-app-state-modal-title"
      >
        <div className="modal-header">
          <h2 id="import-app-state-modal-title">Import App State</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="import-content">
          {step === 'select' && (
            <div className="import-step-select">
              <div className="import-icon">
                <Upload size={48} />
              </div>
              <p className="import-description">
                Import templates, assemblies, stock materials, and custom colors from a Carvd backup file.
              </p>
              {error && (
                <div className="alert alert-error">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
              <button className="btn btn-md btn-filled btn-primary" onClick={handleSelectFile} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Select Backup File'}
              </button>
            </div>
          )}

          {step === 'options' && preview && (
            <div className="import-step-options">
              <div className="import-preview-section">
                <h3>Backup Contents</h3>
                <div className="import-preview-grid">
                  <div className="import-preview-item">
                    <LayoutTemplate size={20} />
                    <span className="import-preview-count">{preview.counts.templates}</span>
                    <span className="import-preview-label">Templates</span>
                  </div>
                  <div className="import-preview-item">
                    <Package size={20} />
                    <span className="import-preview-count">{preview.counts.assemblies}</span>
                    <span className="import-preview-label">Assemblies</span>
                  </div>
                  <div className="import-preview-item">
                    <FileBox size={20} />
                    <span className="import-preview-count">{preview.counts.stocks}</span>
                    <span className="import-preview-label">Stock Materials</span>
                  </div>
                  <div className="import-preview-item">
                    <Palette size={20} />
                    <span className="import-preview-count">{preview.counts.colors}</span>
                    <span className="import-preview-label">Custom Colors</span>
                  </div>
                </div>
              </div>

              <div className="import-options-section">
                <h3>What to Import</h3>
                <div className="import-checkboxes">
                  <label className="import-checkbox">
                    <input
                      type="checkbox"
                      checked={includeTemplates}
                      onChange={(e) => setIncludeTemplates(e.target.checked)}
                      disabled={preview.counts.templates === 0}
                    />
                    <span>Templates ({preview.counts.templates})</span>
                    {preview.duplicates.templates.length > 0 && (
                      <span className="import-duplicate-count">{preview.duplicates.templates.length} existing</span>
                    )}
                  </label>
                  <label className="import-checkbox">
                    <input
                      type="checkbox"
                      checked={includeAssemblies}
                      onChange={(e) => setIncludeAssemblies(e.target.checked)}
                      disabled={preview.counts.assemblies === 0}
                    />
                    <span>Assemblies ({preview.counts.assemblies})</span>
                    {preview.duplicates.assemblies.length > 0 && (
                      <span className="import-duplicate-count">{preview.duplicates.assemblies.length} existing</span>
                    )}
                  </label>
                  <label className="import-checkbox">
                    <input
                      type="checkbox"
                      checked={includeStocks}
                      onChange={(e) => setIncludeStocks(e.target.checked)}
                      disabled={preview.counts.stocks === 0}
                    />
                    <span>Stock Materials ({preview.counts.stocks})</span>
                    {preview.duplicates.stocks.length > 0 && (
                      <span className="import-duplicate-count">{preview.duplicates.stocks.length} existing</span>
                    )}
                  </label>
                  <label className="import-checkbox">
                    <input
                      type="checkbox"
                      checked={includeColors}
                      onChange={(e) => setIncludeColors(e.target.checked)}
                      disabled={preview.counts.colors === 0}
                    />
                    <span>Custom Colors ({preview.counts.colors})</span>
                  </label>
                </div>
              </div>

              {totalDuplicates > 0 && (
                <div className="import-strategy-section">
                  <h3>Duplicate Handling</h3>
                  <p className="import-strategy-hint">
                    {totalDuplicates} item{totalDuplicates !== 1 ? 's' : ''} already exist in your library.
                  </p>
                  <div className="import-strategy-options">
                    <label className="import-radio">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value="merge"
                        checked={mergeStrategy === 'merge'}
                        onChange={() => setMergeStrategy('merge')}
                      />
                      <div className="import-radio-content">
                        <span className="import-radio-title">Keep existing (recommended)</span>
                        <span className="import-radio-description">Skip items that already exist in your library</span>
                      </div>
                    </label>
                    <label className="import-radio">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value="replace"
                        checked={mergeStrategy === 'replace'}
                        onChange={() => setMergeStrategy('replace')}
                      />
                      <div className="import-radio-content">
                        <span className="import-radio-title">Replace all</span>
                        <span className="import-radio-description">
                          Remove your existing items and import all from backup
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-error">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="import-step-result">
              <div className="import-success-icon">
                <CheckCircle size={48} />
              </div>
              <h3>Import Complete</h3>
              <div className="import-result-summary">
                {importResult.imported.templates > 0 && (
                  <div className="import-result-item">
                    <LayoutTemplate size={16} />
                    <span>{importResult.imported.templates} templates imported</span>
                  </div>
                )}
                {importResult.imported.assemblies > 0 && (
                  <div className="import-result-item">
                    <Package size={16} />
                    <span>{importResult.imported.assemblies} assemblies imported</span>
                  </div>
                )}
                {importResult.imported.stocks > 0 && (
                  <div className="import-result-item">
                    <FileBox size={16} />
                    <span>{importResult.imported.stocks} stock materials imported</span>
                  </div>
                )}
                {importResult.imported.colors > 0 && (
                  <div className="import-result-item">
                    <Palette size={16} />
                    <span>{importResult.imported.colors} custom colors imported</span>
                  </div>
                )}
                {importResult.skipped.templates + importResult.skipped.assemblies + importResult.skipped.stocks > 0 && (
                  <div className="import-result-skipped">
                    <span className="import-result-skipped-label">Skipped (already exist):</span>
                    {importResult.skipped.templates > 0 && <span>{importResult.skipped.templates} templates</span>}
                    {importResult.skipped.assemblies > 0 && <span>{importResult.skipped.assemblies} assemblies</span>}
                    {importResult.skipped.stocks > 0 && <span>{importResult.skipped.stocks} stock materials</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
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
