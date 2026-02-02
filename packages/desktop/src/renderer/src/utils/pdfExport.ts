/**
 * PDF Export utilities for cutting diagrams
 * Uses jsPDF to programmatically draw diagrams
 */

import jsPDF from 'jspdf';
import { CutList, StockBoard } from '../types';
import { formatMeasurementWithUnit } from './fractions';

interface ExportOptions {
  projectName: string;
  units: 'imperial' | 'metric';
}

/**
 * Export cutting diagrams to PDF
 * Draws each stock board with its placed parts
 */
export async function exportDiagramsToPdf(
  cutList: CutList,
  options: ExportOptions
): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> {
  const { projectName, units } = options;

  // Group boards by stock
  const boardsByStock = new Map<string, StockBoard[]>();
  for (const board of cutList.stockBoards) {
    const existing = boardsByStock.get(board.stockId) || [];
    existing.push(board);
    boardsByStock.set(board.stockId, existing);
  }

  // Create PDF in landscape for better diagram fit
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt', // points for precise positioning
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - 60; // Leave room for header

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${projectName} - Cutting Diagrams`, margin, margin + 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 35);
  doc.text(
    `Total: ${cutList.stockBoards.length} board${cutList.stockBoards.length !== 1 ? 's' : ''} needed`,
    margin,
    margin + 48
  );

  const headerHeight = 50; // Space for board title and dimensions

  // Draw each stock group - one board per page for clarity
  for (const [, boards] of boardsByStock) {
    const stockName = boards[0].stockName;

    for (const board of boards) {
      // Each board gets its own page
      doc.addPage();

      // Available space for diagram (after header)
      const diagramAreaTop = margin + headerHeight;
      const diagramAreaHeight = pageHeight - diagramAreaTop - margin;
      const diagramAreaWidth = contentWidth;

      // Calculate scale to fit diagram in available space
      const scaleX = diagramAreaWidth / board.stockLength;
      const scaleY = diagramAreaHeight / board.stockWidth;
      const scale = Math.min(scaleX, scaleY);

      const diagramWidth = board.stockLength * scale;
      const diagramHeight = board.stockWidth * scale;

      // Center the diagram horizontally and vertically in available space
      const diagramX = margin + (diagramAreaWidth - diagramWidth) / 2;
      const diagramY = diagramAreaTop + (diagramAreaHeight - diagramHeight) / 2;

      // Board header (top of page)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${stockName} - Board #${board.boardIndex}`, margin, margin + 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const dims = `${formatMeasurementWithUnit(board.stockLength, units)} × ${formatMeasurementWithUnit(board.stockWidth, units)}`;
      doc.text(dims, margin, margin + 38);

      // Parts count
      doc.setFontSize(10);
      doc.text(`${board.placements.length} part${board.placements.length !== 1 ? 's' : ''}`, pageWidth - margin - 60, margin + 20);

      // Draw stock board outline with thicker border
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(2);
      doc.setFillColor(245, 240, 230); // Light background for stock
      doc.rect(diagramX, diagramY, diagramWidth, diagramHeight, 'FD');

      // Draw each placed part
      for (const placement of board.placements) {
        const x = diagramX + placement.x * scale;
        const y = diagramY + placement.y * scale;
        const w = placement.width * scale;
        const h = placement.height * scale;

        // Part fill color
        doc.setFillColor(210, 185, 135); // Wood color
        doc.setDrawColor(100, 70, 40);
        doc.setLineWidth(1);
        doc.rect(x, y, w, h, 'FD');

        // Part label - scale font based on part size
        const label = placement.partName;
        const labelDims = `${formatMeasurementWithUnit(placement.width, units)} × ${formatMeasurementWithUnit(placement.height, units)}`;

        // Calculate appropriate font size based on part dimensions
        const maxFontSize = 12;
        const minFontSize = 6;
        const fontSizeByWidth = w / 8;
        const fontSizeByHeight = h / 3;
        const fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSizeByWidth, fontSizeByHeight));

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 35, 20);

        // Only show labels if part is large enough
        if (w > 25 && h > 15) {
          const textWidth = doc.getTextWidth(label);
          const textX = x + (w - textWidth) / 2;
          const textY = y + h / 2;

          doc.text(label, textX, textY);

          // Dimensions below name (smaller font)
          if (h > 30) {
            doc.setFontSize(Math.max(5, fontSize * 0.7));
            doc.setFont('helvetica', 'normal');
            const dimsWidth = doc.getTextWidth(labelDims);
            doc.text(labelDims, x + (w - dimsWidth) / 2, textY + fontSize);
          }
        }
      }

      // Reset text color for next page
      doc.setTextColor(0, 0, 0);
    }
  }

  // Show save dialog and save
  try {
    const defaultFileName = `${projectName || 'cutting-diagrams'}.pdf`;
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    // Convert PDF to array buffer and save as binary
    const pdfArrayBuffer = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfArrayBuffer);
    const numberArray = Array.from(uint8Array);

    await window.electronAPI.writeBinaryFile(result.filePath, numberArray);

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, error: String(error) };
  }
}
