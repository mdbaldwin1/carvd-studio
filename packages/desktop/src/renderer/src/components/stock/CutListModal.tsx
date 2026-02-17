import { Download } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore, validatePartsForCutList, generateThumbnail } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useLicenseStore } from '../../store/licenseStore';
import { generateOptimizedCutList } from '../../utils/cutListOptimizer';
import { getFeatureLimits, getBlockedMessage } from '../../utils/featureLimits';
import { exportProjectReportToPdf } from '../../utils/pdfExport';
import { logger } from '../../utils/logger';
import { PartValidationIssue } from '../../types';
import { CutListPartsTab } from './CutListPartsTab';
import { CutListDiagramsTab } from './CutListDiagramsTab';
import { CutListStatistics } from './CutListStatistics';
import { ShoppingListTab } from './ShoppingListTab';

type CutListTab = 'parts' | 'diagrams' | 'shopping';

interface CutListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CutListModal({ isOpen, onClose }: CutListModalProps) {
  const [activeTab, setActiveTab] = useState<CutListTab>('parts');
  const [validationIssues, setValidationIssues] = useState<PartValidationIssue[]>([]);

  const parts = useProjectStore((s) => s.parts);
  const stocks = useProjectStore((s) => s.stocks);
  const units = useProjectStore((s) => s.units);
  const kerfWidth = useProjectStore((s) => s.kerfWidth);
  const overageFactor = useProjectStore((s) => s.overageFactor);
  const modifiedAt = useProjectStore((s) => s.modifiedAt);
  const cutList = useProjectStore((s) => s.cutList);
  const setCutList = useProjectStore((s) => s.setCutList);
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const showToast = useUIStore((s) => s.showToast);
  const projectName = useProjectStore((s) => s.projectName);
  const projectNotes = useProjectStore((s) => s.notes);
  const customShoppingItems = useProjectStore((s) => s.customShoppingItems);

  // Get feature limits based on license mode
  const limits = useMemo(() => getFeatureLimits(licenseMode), [licenseMode]);

  // Handle backdrop click (only close if mousedown AND mouseup both on backdrop)
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate cut list
  const handleGenerate = useCallback(() => {
    // Check license limits for optimizer
    if (!limits.canUseOptimizer) {
      showToast(getBlockedMessage('useOptimizer'));
      return;
    }

    // Validate parts first
    const issues = validatePartsForCutList(parts, stocks);
    const blockingIssues = issues.filter((i) => i.severity === 'error' && !i.canBypass);

    if (blockingIssues.length > 0) {
      setValidationIssues(issues);
      return;
    }

    // Clear validation issues and generate
    setValidationIssues([]);
    const bypassedIssues = issues.filter((i) => i.canBypass);
    const newCutList = generateOptimizedCutList(parts, stocks, kerfWidth, overageFactor, modifiedAt, bypassedIssues);

    setCutList(newCutList);
  }, [parts, stocks, kerfWidth, overageFactor, modifiedAt, setCutList, limits.canUseOptimizer, showToast]);

  // Export project report PDF
  const handleDownloadProjectReport = useCallback(async () => {
    if (!cutList) return;

    // Check license limits for PDF export
    if (!limits.canExportPDF) {
      showToast(getBlockedMessage('exportPDF'));
      return;
    }

    try {
      // Generate thumbnail for the report
      const thumbnailData = await generateThumbnail();

      const result = await exportProjectReportToPdf(cutList, {
        projectName: projectName || 'Untitled Project',
        projectNotes: projectNotes || undefined,
        thumbnailData: thumbnailData || undefined,
        units,
        customShoppingItems: customShoppingItems || []
      });

      if (result.success) {
        showToast('Project report saved to PDF');
      } else if (result.error) {
        showToast('Failed to save PDF');
        logger.error('Project report PDF export error:', result.error);
      }
    } catch (error) {
      logger.error('Project report PDF export error:', error);
      showToast('Failed to export project report');
    }
  }, [cutList, projectName, projectNotes, units, customShoppingItems, limits.canExportPDF, showToast]);

  if (!isOpen) return null;

  const hasBlockingIssues = validationIssues.some((i) => i.severity === 'error' && !i.canBypass);

  return (
    <div
      className="cut-list-backdrop fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] flex flex-col animate-modal-fade-in max-h-[85vh] min-h-[500px] w-[900px] max-w-[95vw]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cut-list-modal-title"
      >
        <div className="modal-header py-5 px-6 bg-bg border-b border-border flex justify-between items-center rounded-t-lg">
          <h2 id="cut-list-modal-title" className="text-lg font-semibold text-text m-0">
            Cut List
          </h2>
          <button
            className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* No cut list - show generate UI */}
        {!cutList && (
          <div className="cut-list-generate flex flex-col items-center justify-center gap-4 p-10 text-center">
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-[500px] mx-auto m-0">
              Generate an optimized cut list from your design. All parts must be assigned to a stock material before
              generating.{' '}
              <a
                href="#"
                className="text-accent no-underline hover:underline hover:text-accent-hover transition-colors duration-150"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.openExternal('https://carvd-studio.com/docs#cut-lists');
                }}
              >
                Learn more
              </a>
            </p>

            {parts.length === 0 ? (
              <div className="py-4 text-text-muted text-center">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-semibold mb-2">No parts in your project yet</p>
                <p className="text-sm text-gray-400">
                  Add parts to your design to generate a cut list with optimized cutting diagrams and material costs.
                </p>
              </div>
            ) : (
              <>
                <button
                  className="btn btn-md btn-filled btn-primary"
                  onClick={handleGenerate}
                  disabled={parts.length === 0}
                >
                  Generate Cut List
                </button>

                {validationIssues.length > 0 && (
                  <div className="cut-list-issues mt-4 bg-bg border border-border rounded p-4 text-left w-full max-w-[500px]">
                    <h3 className="text-[14px] font-semibold text-text m-0 mb-2">Issues Found</h3>
                    {hasBlockingIssues && (
                      <p className="text-[12px] text-text-muted mb-2 m-0">
                        Fix the errors below before generating. Each part must be assigned to a stock material.
                      </p>
                    )}
                    <ul className="list-none p-0 m-0">
                      {validationIssues.map((issue, index) => (
                        <li
                          key={index}
                          className={`text-[13px] py-1.5 border-b border-border last:border-b-0 ${issue.severity === 'error' ? 'text-danger' : issue.severity === 'warning' ? 'text-warning' : ''}`}
                        >
                          <strong>{issue.partName}:</strong> {issue.message}
                          {issue.canBypass && <span className="text-[11px] text-text-muted"> (can proceed)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Cut list generated - show tabs */}
        {cutList && (
          <>
            {/* Stale warning */}
            {cutList.isStale && (
              <div className="cut-list-stale-warning flex items-center gap-3 py-2.5 px-6 bg-warning-bg text-warning text-[13px]">
                <span>Project changed since cut list was generated.</span>
                <button className="btn btn-sm btn-filled btn-primary" onClick={handleGenerate}>
                  Regenerate
                </button>
              </div>
            )}

            {/* Skipped parts warning */}
            {cutList.skippedParts.length > 0 && (
              <div className="py-2.5 px-6 bg-[rgba(196,84,84,0.15)] text-danger text-[13px]">
                <strong>Warning:</strong> {cutList.skippedParts.length} part
                {cutList.skippedParts.length !== 1 ? 's' : ''} could not be placed (too large for stock):
                <ul>
                  {cutList.skippedParts.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab bar */}
            <div className="cut-list-tabs flex border-b border-border px-6 gap-0 bg-bg">
              <button
                className={`cut-list-tab py-2.5 px-4 bg-transparent border-none text-[13px] cursor-pointer transition-colors duration-150 border-b-2 hover:text-text ${activeTab === 'parts' ? 'border-accent text-text' : 'border-transparent text-text-muted'}`}
                onClick={() => setActiveTab('parts')}
              >
                Parts List ({cutList.instructions.length})
              </button>
              <button
                className={`cut-list-tab py-2.5 px-4 bg-transparent border-none text-[13px] cursor-pointer transition-colors duration-150 border-b-2 hover:text-text ${activeTab === 'diagrams' ? 'border-accent text-text' : 'border-transparent text-text-muted'}`}
                onClick={() => setActiveTab('diagrams')}
              >
                Cutting Diagrams ({cutList.stockBoards.length})
              </button>
              <button
                className={`cut-list-tab py-2.5 px-4 bg-transparent border-none text-[13px] cursor-pointer transition-colors duration-150 border-b-2 hover:text-text ${activeTab === 'shopping' ? 'border-accent text-text' : 'border-transparent text-text-muted'}`}
                onClick={() => setActiveTab('shopping')}
              >
                Shopping List ({cutList.statistics.byStock.length})
              </button>
            </div>

            <div className="cut-list-content flex-1 flex flex-col overflow-hidden py-5 px-6 bg-bg-alt min-h-0">
              {activeTab === 'parts' && (
                <CutListPartsTab
                  cutList={cutList}
                  units={units}
                  projectName={projectName || 'Untitled Project'}
                  canExportPDF={limits.canExportPDF}
                />
              )}
              {activeTab === 'diagrams' && (
                <CutListDiagramsTab cutList={cutList} units={units} canExportPDF={limits.canExportPDF} />
              )}
              {activeTab === 'shopping' && (
                <ShoppingListTab
                  cutList={cutList}
                  units={units}
                  projectName={projectName || 'Untitled Project'}
                  canExportPDF={limits.canExportPDF}
                />
              )}
            </div>

            {/* Statistics */}
            <CutListStatistics cutList={cutList} />
          </>
        )}

        <div className="cut-list-footer flex items-center justify-end gap-2 py-4 px-6 border-t border-border bg-bg rounded-b-lg">
          {cutList && (
            <>
              <button
                className="btn btn-sm btn-filled btn-primary"
                onClick={handleDownloadProjectReport}
                disabled={!limits.canExportPDF}
                title={!limits.canExportPDF ? 'Upgrade to export PDFs' : 'Download comprehensive project report'}
              >
                <Download size={14} />
                Download Project Report
              </button>
              <div style={{ flex: 1 }} />
            </>
          )}
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            {cutList ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
