// Cut List Optimizer - Guillotine Bin Packing Algorithm
// Optimizes part placement on stock boards for woodworking cut lists

import { v4 as uuidv4 } from 'uuid';
import {
  Part,
  Stock,
  CutList,
  CutInstruction,
  CutPlacement,
  StockBoard,
  CutListStatistics,
  StockSummary,
  PartValidationIssue
} from '../types';

// Internal types for the algorithm
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PartToPlace {
  partId: string;
  partName: string;
  width: number; // cut width (after joinery adjustments)
  height: number; // cut length (after joinery adjustments)
  canRotate: boolean;
  color: string;
  notes?: string;
  isGlueUp: boolean;
  boardsNeeded?: number;
}

interface PlacementResult {
  rect: Rectangle | null;
  rotated: boolean;
  index: number;
}

/**
 * Main entry point: Generate an optimized cut list from parts and stocks
 */
export function generateOptimizedCutList(
  parts: Part[],
  stocks: Stock[],
  kerfWidth: number,
  overageFactor: number,
  projectModifiedAt: string,
  bypassedIssues: PartValidationIssue[]
): CutList {
  // Filter to only parts with valid stock assignments
  const validParts = parts.filter((p) => p.stockId && stocks.find((s) => s.id === p.stockId));

  // Group parts by stock
  const partsByStock = groupPartsByStock(validParts, stocks);

  const instructions: CutInstruction[] = [];
  const stockBoards: StockBoard[] = [];
  const allSkippedParts: string[] = [];

  for (const [stockId, stockParts] of partsByStock) {
    const stock = stocks.find((s) => s.id === stockId)!;

    // Generate cut instructions for all parts of this stock
    // For glue-up panels, this creates individual strip instructions
    for (const part of stockParts) {
      const partInstructions = createInstructions(part, stock);
      instructions.push(...partInstructions);
    }

    // Convert parts to placement format
    // For glue-up panels, this creates individual strips that go through bin packing
    const partsToPlace = preparePartsForPlacement(stockParts, stock);

    // Run bin packing for ALL parts (including glue-up strips)
    if (partsToPlace.length > 0) {
      const { boards, skippedParts } = packPartsOntoStock(partsToPlace, stock, kerfWidth);
      stockBoards.push(...boards);
      allSkippedParts.push(...skippedParts);
    }
  }

  // Calculate statistics (use original part count, not expanded strips)
  const statistics = calculateStatistics(stockBoards, stocks, overageFactor, validParts.length);

  return {
    id: uuidv4(),
    generatedAt: new Date().toISOString(),
    projectModifiedAt,
    isStale: false,
    instructions,
    stockBoards,
    statistics,
    bypassedIssues,
    skippedParts: allSkippedParts,
    kerfWidth,
    overageFactor
  };
}

/**
 * Group parts by their assigned stock ID
 */
function groupPartsByStock(parts: Part[], stocks: Stock[]): Map<string, Part[]> {
  const map = new Map<string, Part[]>();

  for (const part of parts) {
    if (!part.stockId) continue;
    const stock = stocks.find((s) => s.id === part.stockId);
    if (!stock) continue;

    const existing = map.get(part.stockId) || [];
    existing.push(part);
    map.set(part.stockId, existing);
  }

  return map;
}

/**
 * Create cut instructions from a part
 * For glue-up panels, this creates one instruction per strip/board needed
 */
function createInstructions(part: Part, stock: Stock): CutInstruction[] {
  const cutLength = part.length + (part.extraLength || 0);
  const cutWidth = part.width + (part.extraWidth || 0);
  const isGlueUp = part.glueUpPanel || false;

  if (!isGlueUp) {
    // Regular part: single instruction
    return [{
      partId: part.id,
      partName: part.name,
      cutLength,
      cutWidth,
      thickness: part.thickness,
      stockId: stock.id,
      stockName: stock.name,
      grainSensitive: part.grainSensitive,
      canRotate: !part.grainSensitive,
      isGlueUp: false,
      notes: part.notes
    }];
  }

  // Glue-up panel: create individual strip instructions
  // Calculate optimal strip width so strips add up exactly to final panel width
  const rawNumStrips = Math.ceil(cutWidth / stock.width);
  // Limit strips to prevent unreasonable glue-up sizes (max 50 strips)
  const numStrips = Math.min(rawNumStrips, 50);
  const stripWidth = cutWidth / numStrips;
  const instructions: CutInstruction[] = [];

  for (let i = 0; i < numStrips; i++) {
    instructions.push({
      partId: `${part.id}-strip-${i + 1}`,
      partName: `${part.name} (strip ${i + 1}/${numStrips})`,
      cutLength: cutLength,
      cutWidth: stripWidth, // Optimal strip width for this glue-up
      thickness: part.thickness,
      stockId: stock.id,
      stockName: stock.name,
      grainSensitive: part.grainSensitive,
      canRotate: false, // Glue-up strips should not rotate (need consistent grain)
      isGlueUp: true,
      boardsNeeded: numStrips,
      notes: i === 0
        ? `Glue-up panel: ${numStrips} strips × ${stripWidth.toFixed(2)}" = ${cutWidth}" final width${part.notes ? '. ' + part.notes : ''}`
        : undefined
    });
  }

  return instructions;
}

/**
 * Convert parts to the internal format for placement
 * For glue-up panels, this creates individual strip placements
 */
function preparePartsForPlacement(parts: Part[], stock: Stock): PartToPlace[] {
  const result: PartToPlace[] = [];

  for (const part of parts) {
    const cutLength = part.length + (part.extraLength || 0);
    const cutWidth = part.width + (part.extraWidth || 0);
    const isGlueUp = part.glueUpPanel || false;

    if (!isGlueUp) {
      // Regular part: single placement
      result.push({
        partId: part.id,
        partName: part.name,
        width: cutLength, // Note: we use "width" for length in 2D packing
        height: cutWidth, // and "height" for width
        canRotate: !part.grainSensitive,
        color: part.color,
        notes: part.notes,
        isGlueUp: false
      });
    } else {
      // Glue-up panel: create individual strip placements
      // Calculate optimal strip width so strips add up exactly to final panel width
      // n = ceil(finalWidth / maxStripWidth)
      // stripWidth = finalWidth / n
      const rawNumStrips = Math.ceil(cutWidth / stock.width);
      // Limit strips to prevent unreasonable glue-up sizes (max 50 strips)
      const numStrips = Math.min(rawNumStrips, 50);
      const stripWidth = cutWidth / numStrips;

      for (let i = 0; i < numStrips; i++) {
        result.push({
          partId: `${part.id}-strip-${i + 1}`,
          partName: `${part.name} (strip ${i + 1}/${numStrips})`,
          width: cutLength, // Strip length = panel length
          height: stripWidth, // Strip width = optimal width for this glue-up
          canRotate: false, // Glue-up strips should not rotate (need consistent grain)
          color: part.color,
          notes: part.notes,
          isGlueUp: true,
          boardsNeeded: numStrips
        });
      }
    }
  }

  return result;
}

interface PackingResult {
  boards: StockBoard[];
  skippedParts: string[]; // Part names that couldn't be placed
}

/**
 * Main bin packing algorithm: pack parts onto stock boards
 * Uses guillotine cuts (straight cuts that go completely across the board)
 */
function packPartsOntoStock(
  parts: PartToPlace[],
  stock: Stock,
  kerfWidth: number
): PackingResult {
  // Sort by area, largest first (Best Fit Decreasing)
  const sorted = [...parts].sort((a, b) => b.width * b.height - a.width * a.height);

  const boards: StockBoard[] = [];
  const skippedParts: string[] = [];
  let currentPlacements: CutPlacement[] = [];
  let freeRects: Rectangle[] = [
    { x: 0, y: 0, width: stock.length, height: stock.width }
  ];
  let boardIndex = 1;

  for (const part of sorted) {
    // Try to find a spot on the current board
    const result = findBestFit(freeRects, part.width, part.height, part.canRotate, kerfWidth, part.isGlueUp);

    if (result.rect) {
      // Place the part
      const placement = createPlacement(part, result.rect, result.rotated);
      currentPlacements.push(placement);

      // Split the rectangle (guillotine cut)
      // Only add kerf when there's material left over (a cut will be made)
      const partWidth = result.rotated ? part.height : part.width;
      const partHeight = result.rotated ? part.width : part.height;
      // Kerf only if part doesn't use full width of the rect
      const widthKerf = partWidth < result.rect.width ? kerfWidth : 0;
      // For glue-up strips, never add kerf to height; otherwise only if not using full height
      const heightKerf = part.isGlueUp ? 0 : (partHeight < result.rect.height ? kerfWidth : 0);
      freeRects = splitRectangle(
        freeRects,
        result.index,
        result.rect,
        partWidth + widthKerf,
        partHeight + heightKerf
      );
    } else {
      // Part doesn't fit - save current board and start new one
      if (currentPlacements.length > 0) {
        boards.push(createStockBoard(stock, boardIndex++, currentPlacements));
      }

      // Start new board
      currentPlacements = [];
      freeRects = [{ x: 0, y: 0, width: stock.length, height: stock.width }];

      // Try to place on new board
      const newResult = findBestFit(freeRects, part.width, part.height, part.canRotate, kerfWidth, part.isGlueUp);

      if (newResult.rect) {
        const placement = createPlacement(part, newResult.rect, newResult.rotated);
        currentPlacements.push(placement);

        // Split the rectangle - only add kerf when there's material left over
        const partWidth = newResult.rotated ? part.height : part.width;
        const partHeight = newResult.rotated ? part.width : part.height;
        const widthKerf = partWidth < newResult.rect.width ? kerfWidth : 0;
        const heightKerf = part.isGlueUp ? 0 : (partHeight < newResult.rect.height ? kerfWidth : 0);
        freeRects = splitRectangle(
          freeRects,
          newResult.index,
          newResult.rect,
          partWidth + widthKerf,
          partHeight + heightKerf
        );
      } else {
        // Part is too big for stock - track as skipped
        console.warn(`Part "${part.partName}" (${part.width}" × ${part.height}") doesn't fit on stock "${stock.name}" (${stock.length}" × ${stock.width}")`);
        skippedParts.push(part.partName);
      }
    }
  }

  // Don't forget the last board
  if (currentPlacements.length > 0) {
    boards.push(createStockBoard(stock, boardIndex, currentPlacements));
  }

  return { boards, skippedParts };
}

/**
 * Find the best fitting rectangle for a part
 * Uses "Best Short Side Fit" heuristic
 * @param isGlueUpStrip - If true, don't add kerf to height (strip spans full stock width edge-to-edge)
 *
 * Kerf logic: Kerf is only needed when a cut will actually be made.
 * - If part dimension exactly matches available space, no cut is made, no kerf needed
 * - If part dimension is less than available space, a cut is made, kerf is needed
 */
function findBestFit(
  freeRects: Rectangle[],
  width: number,
  height: number,
  canRotate: boolean,
  kerfWidth: number,
  isGlueUpStrip: boolean = false
): PlacementResult {
  let bestRect: Rectangle | null = null;
  let bestRotated = false;
  let bestIndex = -1;
  let bestScore = Infinity;

  for (let i = 0; i < freeRects.length; i++) {
    const rect = freeRects[i];

    // Try normal orientation
    // Kerf is only needed if part dimension < rect dimension (a cut will be made)
    // If part exactly matches rect dimension, no cut needed, no kerf
    const widthKerf = width < rect.width ? kerfWidth : 0;
    // For glue-up strips, never add kerf to height (they span edge-to-edge)
    const heightKerf = isGlueUpStrip ? 0 : (height < rect.height ? kerfWidth : 0);

    if (rect.width >= width + widthKerf && rect.height >= height + heightKerf) {
      // Score by leftover short side (prefer tighter fits)
      const leftoverX = rect.width - width - widthKerf;
      const leftoverY = rect.height - height - heightKerf;
      const score = Math.min(leftoverX, leftoverY);

      if (score < bestScore) {
        bestScore = score;
        bestRect = rect;
        bestRotated = false;
        bestIndex = i;
      }
    }

    // Try rotated (if allowed)
    if (canRotate) {
      // Recalculate kerf for rotated orientation
      const rotatedWidthKerf = height < rect.width ? kerfWidth : 0;
      const rotatedHeightKerf = isGlueUpStrip ? 0 : (width < rect.height ? kerfWidth : 0);

      if (rect.width >= height + rotatedWidthKerf && rect.height >= width + rotatedHeightKerf) {
        const leftoverX = rect.width - height - rotatedWidthKerf;
        const leftoverY = rect.height - width - rotatedHeightKerf;
        const score = Math.min(leftoverX, leftoverY);

        if (score < bestScore) {
          bestScore = score;
          bestRect = rect;
          bestRotated = true;
          bestIndex = i;
        }
      }
    }
  }

  return { rect: bestRect, rotated: bestRotated, index: bestIndex };
}

/**
 * Create a placement object from a part and rectangle
 */
function createPlacement(
  part: PartToPlace,
  rect: Rectangle,
  rotated: boolean
): CutPlacement {
  return {
    partId: part.partId,
    partName: part.partName,
    x: rect.x,
    y: rect.y,
    width: rotated ? part.height : part.width,
    height: rotated ? part.width : part.height,
    rotated,
    color: part.color
  };
}

/**
 * Split a rectangle after placing a part (guillotine cut)
 * Creates two new rectangles: one to the right, one above
 */
function splitRectangle(
  freeRects: Rectangle[],
  index: number,
  usedRect: Rectangle,
  usedWidth: number,
  usedHeight: number
): Rectangle[] {
  const rect = freeRects[index];
  const newRects = freeRects.filter((_, i) => i !== index);

  // Right remainder (horizontal split)
  if (rect.width > usedWidth) {
    newRects.push({
      x: rect.x + usedWidth,
      y: rect.y,
      width: rect.width - usedWidth,
      height: rect.height // Full height of original
    });
  }

  // Top remainder (vertical split, limited to used width)
  if (rect.height > usedHeight) {
    newRects.push({
      x: rect.x,
      y: rect.y + usedHeight,
      width: usedWidth, // Limited to the used width (guillotine)
      height: rect.height - usedHeight
    });
  }

  // Merge overlapping rectangles for better space utilization
  return mergeRectangles(newRects);
}

/**
 * Merge adjacent/overlapping rectangles where possible
 */
function mergeRectangles(rects: Rectangle[]): Rectangle[] {
  // Simple implementation: just return as-is for now
  // A more sophisticated version could merge adjacent rectangles
  return rects.filter((r) => r.width > 0 && r.height > 0);
}

/**
 * Create a StockBoard from placements
 */
function createStockBoard(
  stock: Stock,
  boardIndex: number,
  placements: CutPlacement[]
): StockBoard {
  const stockArea = stock.length * stock.width;
  const usedArea = placements.reduce((sum, p) => sum + p.width * p.height, 0);
  const wasteArea = stockArea - usedArea;

  return {
    stockId: stock.id,
    stockName: stock.name,
    boardIndex,
    stockLength: stock.length,
    stockWidth: stock.width,
    placements,
    wasteArea,
    usedArea,
    utilizationPercent: (usedArea / stockArea) * 100
  };
}

/**
 * Calculate overall statistics for the cut list
 */
function calculateStatistics(
  stockBoards: StockBoard[],
  stocks: Stock[],
  overageFactor: number,
  totalParts: number
): CutListStatistics {
  // Group boards by stock
  const boardsByStock = new Map<string, StockBoard[]>();
  for (const board of stockBoards) {
    const existing = boardsByStock.get(board.stockId) || [];
    existing.push(board);
    boardsByStock.set(board.stockId, existing);
  }

  // Calculate per-stock summaries
  const byStock: StockSummary[] = [];
  let totalBoardFeet = 0;
  let totalWaste = 0;
  let totalUsed = 0;
  let estimatedCost = 0;
  let totalWasteCost = 0;

  for (const [stockId, boards] of boardsByStock) {
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) continue;

    const actualBoardsUsed = boards.length;
    const boardsNeeded = Math.ceil(actualBoardsUsed * (1 + overageFactor));
    const boardFeetPerBoard = calculateBoardFeet(stock.length, stock.width, stock.thickness);
    const boardFeet = boardFeetPerBoard * boardsNeeded;
    const linearFeet = (stock.length / 12) * boardsNeeded;

    let cost = 0;
    if (stock.pricingUnit === 'board_foot') {
      cost = boardFeet * stock.pricePerUnit;
    } else {
      cost = boardsNeeded * stock.pricePerUnit;
    }

    const stockWaste = boards.reduce((sum, b) => sum + b.wasteArea, 0);
    const stockUsed = boards.reduce((sum, b) => sum + b.usedArea, 0);
    const avgUtilization = boards.length > 0
      ? boards.reduce((sum, b) => sum + b.utilizationPercent, 0) / boards.length
      : 0;

    // Calculate waste cost for this stock type
    let stockWasteCost = 0;
    const stockArea = stock.length * stock.width;
    if (stock.pricingUnit === 'board_foot') {
      // Convert waste square inches to board feet, then to cost
      // Waste board feet = (wasteArea * thickness) / 144
      const wasteBoardFeet = (stockWaste * stock.thickness) / 144;
      stockWasteCost = wasteBoardFeet * stock.pricePerUnit;
    } else {
      // For per-item pricing, waste cost is proportional to the area wasted
      const wasteRatio = stockWaste / (stockArea * actualBoardsUsed);
      stockWasteCost = wasteRatio * (actualBoardsUsed * stock.pricePerUnit);
    }

    byStock.push({
      stockId,
      stockName: stock.name,
      boardsNeeded,
      boardFeet,
      cost,
      // Shopping list fields
      stockLength: stock.length,
      stockWidth: stock.width,
      stockThickness: stock.thickness,
      pricingUnit: stock.pricingUnit,
      pricePerUnit: stock.pricePerUnit,
      linearFeet,
      actualBoardsUsed,
      averageUtilization: avgUtilization,
      wasteSquareInches: stockWaste
    });

    totalBoardFeet += boardFeet;
    totalWaste += stockWaste;
    totalUsed += stockUsed;
    estimatedCost += cost;
    totalWasteCost += stockWasteCost;
  }

  const wastePercentage = totalUsed + totalWaste > 0
    ? (totalWaste / (totalUsed + totalWaste)) * 100
    : 0;

  return {
    totalParts,
    totalStockBoards: stockBoards.length,
    totalBoardFeet,
    totalWasteSquareInches: totalWaste,
    wastePercentage,
    estimatedCost,
    totalWasteCost,
    byStock
  };
}

/**
 * Calculate board feet from dimensions
 * Board Feet = (Length × Width × Thickness) / 144
 */
function calculateBoardFeet(length: number, width: number, thickness: number): number {
  return (length * width * thickness) / 144;
}
