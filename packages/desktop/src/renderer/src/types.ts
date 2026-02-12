// Core domain types for Carvd Studio

export interface Stock {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricingUnit: 'board_foot' | 'per_item'; // how this stock is priced
  pricePerUnit: number;
  color: string; // display color for parts using this stock
}

// Embedded stock snapshot for assemblies (allows assemblies to be self-contained)
export interface EmbeddedStock {
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricingUnit: 'board_foot' | 'per_item';
  pricePerUnit: number;
  color: string;
}

// A part template within an assembly (position relative to assembly origin)
export interface AssemblyPart {
  // All Part fields except id (will be generated on placement) and position (stored as relative)
  name: string;
  length: number;
  width: number;
  thickness: number;
  relativePosition: { x: number; y: number; z: number }; // position relative to assembly origin
  rotation: Rotation3D;
  stockId: string | null;
  grainSensitive: boolean;
  grainDirection: 'length' | 'width';
  color: string;
  notes?: string;
  extraLength?: number;
  extraWidth?: number;
  // Embedded stock snapshot - allows assembly to recreate stock if original is unavailable
  embeddedStock?: EmbeddedStock;
}

// A group template within an assembly
export interface AssemblyGroup {
  // Original group ID used for mapping members (not preserved on placement)
  originalId: string;
  name: string;
}

// A group member template within an assembly
export interface AssemblyGroupMember {
  // References use indices into the parts/groups arrays
  groupIndex: number; // index into assembly groups array
  memberType: 'part' | 'group';
  memberIndex: number; // index into assembly parts or groups array
}

// Thumbnail data for assemblies (and projects)
export interface AssemblyThumbnailData {
  data: string; // Base64 encoded PNG
  width: number;
  height: number;
  generatedAt: string;
  manuallySet?: boolean; // If true, don't auto-override this thumbnail
}

// Assembly - a reusable multi-part template (e.g., drawer assembly, face frame)
export interface Assembly {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string; // Emoji fallback
  thumbnailData?: AssemblyThumbnailData; // Base64 image thumbnail (preferred)
  // Template parts with positions relative to assembly origin (0,0,0)
  parts: AssemblyPart[];
  // Optional group structure
  groups: AssemblyGroup[];
  groupMembers: AssemblyGroupMember[];
  // Metadata
  createdAt: string;
  modifiedAt: string;
}

export type RotationAngle = 0 | 90 | 180 | 270;

export interface Rotation3D {
  x: RotationAngle;
  y: RotationAngle;
  z: RotationAngle;
}

export interface Part {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  position: { x: number; y: number; z: number };
  rotation: Rotation3D; // degrees around each axis (90° increments)
  stockId: string | null; // assigned stock (null = unassigned)
  grainSensitive: boolean;
  grainDirection: 'length' | 'width'; // which way the grain runs on this part
  color: string; // inherited from stock when assigned
  notes?: string; // fabrication/assembly notes (e.g., "edge band front", "drill pocket holes")
  // Joinery adjustments - extra material for cut list (not shown in 3D view)
  extraLength?: number; // additional length for cut list (e.g., tenon material)
  extraWidth?: number; // additional width for cut list (e.g., dado insertion depth)
  // Glue-up panel flag - wide panels made by edge-gluing multiple boards
  glueUpPanel?: boolean;
  // Ignore overlap flag - builder is aware of intentional overlap (e.g., shelf notched for legs)
  ignoreOverlap?: boolean;
}

export interface Group {
  id: string;
  name: string;
}

// Enables hierarchical grouping (groups can contain parts OR other groups)
export interface GroupMember {
  id: string;
  groupId: string; // the group this member belongs to
  memberType: 'part' | 'group';
  memberId: string; // id of the part or nested group
}

// Project thumbnail for visual preview
export interface ProjectThumbnail {
  data: string; // Base64 encoded PNG
  width: number;
  height: number;
  generatedAt: string; // ISO timestamp
  isCustom?: boolean; // Deprecated: use manuallySet instead
  manuallySet?: boolean; // If true, don't auto-override this thumbnail
}

export interface Project {
  version: string;
  name: string;
  stocks: Stock[];
  parts: Part[];
  groups: Group[];
  groupMembers: GroupMember[];
  // Project-level assemblies (reusable multi-part templates)
  assemblies?: Assembly[];
  // Project-level settings
  units: 'imperial' | 'metric';
  gridSize: number; // in inches
  // Pre-cut list settings
  kerfWidth?: number; // saw blade kerf in inches (default 0.125 = 1/8")
  overageFactor?: number; // material overage percentage (default 0.1 = 10%)
  projectNotes?: string; // free-form project notes
  // Stock constraint settings (initialized from app defaults when project is created)
  stockConstraints?: StockConstraintSettings;
  // Persistent snap guides (saved with project)
  snapGuides?: SnapGuide[];
  // Custom shopping list items (hardware, fasteners, etc. - persists through cut list regeneration)
  customShoppingItems?: CustomShoppingItem[];
  // Generated cut list (if any)
  cutList?: CutList;
  // Project thumbnail for visual preview in Start Screen
  thumbnail?: ProjectThumbnail;
  // Camera state (position and target) for restoring view on project load
  cameraState?: CameraState;
  createdAt: string;
  modifiedAt: string;
}

// Stock constraint settings - control how parts relate to their assigned stock
export interface StockConstraintSettings {
  constrainDimensions: boolean; // Prevent part dimensions from exceeding stock dimensions
  constrainGrain: boolean; // Lock grain direction to match stock grain
  constrainColor: boolean; // Lock part color to stock color
  preventOverlap: boolean; // Prevent parts from occupying the same space
}

// App-level settings (persisted via electron-store)
// Snap sensitivity presets
export type SnapSensitivity = 'tight' | 'normal' | 'loose';

export interface AppSettings {
  defaultUnits: 'imperial' | 'metric';
  defaultGridSize: number;
  theme: 'light' | 'dark' | 'system';
  confirmBeforeDelete: boolean;
  showHotkeyHints: boolean;
  // Default stock constraint settings (used for new projects)
  stockConstraints: StockConstraintSettings;
  // Snap settings
  liveGridSnap: boolean; // Snap to grid during drag (not just on release)
  snapSensitivity: SnapSensitivity; // How close parts need to be to snap
  snapToOrigin: boolean; // Snap to workspace origin (X=0, Y=0, Z=0 planes)
  dimensionSnapSameTypeOnly: boolean; // Only match same dimension types (length to length, etc.)
  // Display settings
  lightingMode?: LightingMode; // Lighting preset for 3D workspace (default | bright | studio | dramatic)
  brightnessMultiplier?: number; // Brightness multiplier (0.25 to 2.0, default 1.0)
  // Auto-save settings
  autoSave?: boolean; // Automatically save project when changes are made
}

// Transient view state (not persisted)
export type DisplayMode = 'solid' | 'wireframe' | 'translucent';

// Lighting mode for 3D workspace
export type LightingMode = 'default' | 'bright' | 'studio' | 'dramatic';

// Camera state for persisting view angle across sessions
export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number }; // OrbitControls target (where camera looks at)
}

// Persistent snap guide (like Illustrator guides)
export interface SnapGuide {
  id: string;
  axis: 'x' | 'y' | 'z'; // Which axis this guide is perpendicular to
  position: number; // Position along that axis (in inches)
  label?: string; // Optional user label for the guide
}

// Distance indicator for snap feedback
export interface SnapDistanceIndicator {
  // Line endpoints for the distance indicator
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  // The distance value
  distance: number;
  // Label position (midpoint of the line, offset for visibility)
  labelPosition: { x: number; y: number; z: number };
}

// Clipboard data structure for copy/paste with group support
export interface Clipboard {
  parts: Part[];
  groups: Group[];
  groupMembers: GroupMember[];
}

// Snap alignment line for visual feedback during drag
export interface SnapLine {
  axis: 'x' | 'y' | 'z'; // Which axis this line is along
  type: 'edge' | 'center' | 'face' | 'equal-spacing' | 'dimension-match'; // Type of snap
  // Line start and end points in world space
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  // The snap value that was applied
  snapValue: number;
  // Optional distance indicators (e.g., showing distances from center to edges)
  distanceIndicators?: SnapDistanceIndicator[];
  // Optional metadata for dimension-match snaps (enhanced labels)
  dimensionMatchInfo?: {
    isStandard: boolean; // True if snapping to a standard dimension (12", 24", etc.)
    sourcePart?: string; // Name of the part being matched (if not standard)
    sourceDimension?: 'length' | 'width' | 'thickness'; // Which dimension of source was matched
  };
  // Optional connector line to show connection to matched part
  connectorLine?: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };
}

// Reference distance indicator for showing distances to reference parts
export interface ReferenceDistanceIndicator {
  id: string;
  axis: 'x' | 'y' | 'z';
  type: 'edge-to-edge' | 'edge-offset'; // edge-to-edge = gap between parts, edge-offset = alignment offset
  fromPartId: string;
  toPartId: string; // reference part
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  distance: number;
  labelPosition: { x: number; y: number; z: number };
}

// ============================================================
// Cut List Types
// ============================================================

// Validation issue for a part before cut list generation
export interface PartValidationIssue {
  partId: string;
  partName: string;
  type: 'no_stock' | 'exceeds_dimensions' | 'exceeds_thickness' | 'grain_mismatch';
  message: string;
  severity: 'error' | 'warning';
  canBypass?: boolean; // true for glue-up panels exceeding width
}

// Represents a single part's cut instructions
export interface CutInstruction {
  partId: string;
  partName: string;
  cutLength: number; // length + extraLength
  cutWidth: number; // width + extraWidth
  thickness: number;
  stockId: string;
  stockName: string;
  grainSensitive: boolean;
  canRotate: boolean; // true if part can be rotated for optimization
  isGlueUp: boolean; // true if this is a glue-up panel
  boardsNeeded?: number; // number of boards for glue-up panels
  notes?: string;
}

// Placement of a part on a stock board for cutting
export interface CutPlacement {
  partId: string;
  partName: string;
  x: number; // position on stock board (inches from left)
  y: number; // position on stock board (inches from bottom)
  width: number; // as placed (may be rotated)
  height: number; // as placed (may be rotated)
  rotated: boolean; // true if rotated 90 degrees from original orientation
  color: string; // part color for diagram
}

// A single stock board with its cuts
export interface StockBoard {
  stockId: string;
  stockName: string;
  boardIndex: number; // which board of this stock type (1, 2, 3...)
  stockLength: number;
  stockWidth: number;
  placements: CutPlacement[];
  wasteArea: number; // square inches of waste
  usedArea: number; // square inches used
  utilizationPercent: number;
}

// Per-stock summary in statistics
export interface StockSummary {
  stockId: string;
  stockName: string;
  boardsNeeded: number;
  boardFeet: number;
  cost: number;
  // Shopping list fields
  stockLength: number;
  stockWidth: number;
  stockThickness: number;
  pricingUnit: 'board_foot' | 'per_item';
  pricePerUnit: number;
  linearFeet: number; // (stockLength / 12) * boardsNeeded
  actualBoardsUsed: number; // boards from optimizer (before overage rounding)
  averageUtilization: number; // average utilization across boards of this type
  wasteSquareInches: number; // total waste for this stock type
}

// Statistics for the entire cut list
export interface CutListStatistics {
  totalParts: number;
  totalStockBoards: number;
  totalBoardFeet: number;
  totalWasteSquareInches: number;
  wastePercentage: number;
  estimatedCost: number;
  totalWasteCost: number; // cost of wasted material
  byStock: StockSummary[];
}

// The complete cut list
export interface CutList {
  id: string;
  generatedAt: string; // ISO timestamp
  projectModifiedAt: string; // project modifiedAt when generated
  isStale: boolean; // true if project changed since generation

  // Per-part instructions
  instructions: CutInstruction[];

  // Per-stock optimization results
  stockBoards: StockBoard[];

  // Overall statistics
  statistics: CutListStatistics;

  // Any validation issues that were bypassed (e.g., glue-up panels)
  bypassedIssues: PartValidationIssue[];

  // Parts that couldn't be placed (too large for stock - should be rare if validation works)
  skippedParts: string[];

  // Project settings at time of generation (for reference)
  kerfWidth: number;
  overageFactor: number;
}

// ============================================================
// Custom Shopping List Items
// ============================================================

// Custom item that users can add to the shopping list (hardware, glue, etc.)
// These persist with the project and survive cut list regeneration
export interface CustomShoppingItem {
  id: string;
  name: string;
  description?: string; // optional notes/description
  quantity: number;
  unitPrice: number;
  category?: string; // optional grouping (e.g., "Hardware", "Finish", "Fasteners")
}

// ============================================================
// File Format Types (.carvd files)
// ============================================================

// Current file format version - increment when making breaking changes
export const CARVD_FILE_VERSION = 1;

// The .carvd file format - plain JSON structure
export interface CarvdFile {
  // File format version for migration support
  version: number;

  // Project metadata
  project: {
    name: string;
    createdAt: string; // ISO timestamp
    modifiedAt: string; // ISO timestamp
    units: 'imperial' | 'metric';
    gridSize: number; // in inches
    kerfWidth: number; // saw blade kerf in inches
    overageFactor: number; // material overage percentage (0-1)
    projectNotes: string;
    stockConstraints: StockConstraintSettings;
  };

  // Project data
  parts: Part[];
  stocks: Stock[];
  groups: Group[];
  groupMembers: GroupMember[];

  // Optional data
  assemblies?: Assembly[];
  snapGuides?: SnapGuide[];
  customShoppingItems?: CustomShoppingItem[];

  // Generated data (saved so users don't have to regenerate on every load)
  cutList?: CutList;

  // Project thumbnail for visual preview in Start Screen
  thumbnail?: ProjectThumbnail;

  // Camera state for restoring view on project load
  cameraState?: CameraState;
}

// Result of file validation
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  // The validated/migrated file data (if valid)
  data?: CarvdFile;
}
