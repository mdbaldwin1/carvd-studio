import { Download } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore, validatePartsForCutList, generateThumbnail } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
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
  const licenseMode = useProjectStore((s) => s.licenseMode);
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
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] flex flex-col animate-modal-fade-in max-h-[85vh] min-h-[500px] w-[900px] max-w-[95vw]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cut-list-modal-title"
      >
        <div className="py-5 px-6 bg-bg border-b border-border flex justify-between items-center rounded-t-lg">
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
          <div className="cut-list-generate">
            <p className="cut-list-intro">
              Generate an optimized cut list from your design. All parts must be assigned to a stock material before
              generating.{' '}
              <a
                href="#"
                className="learn-more-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.openExternal('https://carvd-studio.com/docs#cut-lists');
                }}
              >
                Learn more
              </a>
            </p>

            {parts.length === 0 ? (
              <div className="cut-list-empty">
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
                  <div className="cut-list-issues">
                    <h3>Issues Found</h3>
                    {hasBlockingIssues && (
                      <p className="cut-list-issues-note">
                        Fix the errors below before generating. Each part must be assigned to a stock material.
                      </p>
                    )}
                    <ul className="cut-list-issues-list">
                      {validationIssues.map((issue, index) => (
                        <li key={index} className={`cut-list-issue ${issue.severity}`}>
                          <strong>{issue.partName}:</strong> {issue.message}
                          {issue.canBypass && <span className="bypass-note"> (can proceed)</span>}
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
              <div className="cut-list-stale-warning">
                <span>Project changed since cut list was generated.</span>
                <button className="btn btn-sm btn-filled btn-primary" onClick={handleGenerate}>
                  Regenerate
                </button>
              </div>
            )}

            {/* Skipped parts warning */}
            {cutList.skippedParts.length > 0 && (
              <div className="cut-list-error-warning">
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
            <div className="cut-list-tabs">
              <button
                className={`cut-list-tab ${activeTab === 'parts' ? 'active' : ''}`}
                onClick={() => setActiveTab('parts')}
              >
                Parts List ({cutList.instructions.length})
              </button>
              <button
                className={`cut-list-tab ${activeTab === 'diagrams' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagrams')}
              >
                Cutting Diagrams ({cutList.stockBoards.length})
              </button>
              <button
                className={`cut-list-tab ${activeTab === 'shopping' ? 'active' : ''}`}
                onClick={() => setActiveTab('shopping')}
              >
                Shopping List ({cutList.statistics.byStock.length})
              </button>
            </div>

            <div className="cut-list-content">
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

        <div className="flex items-center justify-end gap-2 py-4 px-6 border-t border-border bg-bg rounded-b-lg">
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
