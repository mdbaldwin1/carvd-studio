import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
import type {
  CircularCutFeature,
  EndCutFeature,
  RectCutFeature,
  RoundedCutFeature
} from '../../src/renderer/src/types';
import fs from 'fs';
import path from 'path';
import {
  addPartFromSidebar,
  clickMenuItem,
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  openSelectionContextMenu,
  queueOpenPaths,
  queueSavePath,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

async function selectFirstPart(window: Page): Promise<void> {
  await window.evaluate(() => {
    const part = window.useProjectStore.getState().parts[0];
    window.useSelectionStore.getState().selectPart(part.id);
  });
}

async function isEditingPartCuts(window: Page): Promise<boolean> {
  return window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts);
}

async function getFirstPartFeatureCount(window: Page): Promise<number> {
  return window.evaluate(() => window.useProjectStore.getState().parts[0]?.features?.length ?? 0);
}

async function getPartCount(window: Page): Promise<number> {
  return window.evaluate(() => window.useProjectStore.getState().parts.length);
}

async function openPartCutsFromProperties(window: Page): Promise<void> {
  await selectFirstPart(window);
  await window.getByRole('button', { name: 'Edit Part Cuts' }).click();
  await expect(window.locator('.header-mode-chip', { hasText: 'Part Cuts' })).toBeVisible();
}

async function addDadoCut(window: Page): Promise<void> {
  await addPresetCut(window, 'Dado');
}

async function addPresetCut(window: Page, preset: string): Promise<void> {
  await window.getByRole('button', { name: '+ Add Cut' }).click();
  await window.getByRole('button', { name: new RegExp(`^${preset}\\b`) }).click();
  await window.getByRole('button', { name: 'Save Cut' }).click();
}

async function getFirstPartFeatures(window: Page): Promise<Array<{ id: string; cutType: string }>> {
  return window.evaluate(() =>
    (window.useProjectStore.getState().parts[0]?.features ?? []).map((feature) => ({
      id: feature.id,
      cutType: feature.kind === 'end_cut' ? feature.cutType : feature.cutType
    }))
  );
}

async function pressSaveShortcut(window: Page): Promise<void> {
  await window.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+S`);
}

/**
 * Extracts literal text from the uncompressed `(...) Tj` operators emitted by
 * jsPDF.  In particular, a long instruction may be continued in a second Tj
 * operator after `T*`; joining those operands reflects the text a reader sees
 * without depending on the host's `strings` binary or PDF layout wrapping.
 */
function extractJsPdfLiteralText(pdfPath: string): string {
  const pdf = fs.readFileSync(pdfPath, 'latin1');
  const literals = [...pdf.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)].map((match) =>
    match[0].slice(1, match[0].lastIndexOf(')'))
  );
  return literals
    .map((literal) =>
      literal
        .replace(/\\([0-7]{1,3})/g, (_escape, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)))
        .replace(
          /\\([nrtbf])/g,
          (_escape, character: string) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[character]
        )
        .replace(/\\([\\()])/g, '$1')
    )
    .join(' ');
}

type EndFeatureExpectation = Pick<EndCutFeature, 'kind' | 'cutType' | 'target' | 'parameters'> & {
  label: string;
  enabled: boolean;
};
type RectFeatureExpectation = Pick<RectCutFeature, 'kind' | 'cutType' | 'target' | 'parameters' | 'placement'> & {
  label: string;
  enabled: boolean;
};
type CircularFeatureExpectation = Pick<
  CircularCutFeature,
  'kind' | 'cutType' | 'target' | 'parameters' | 'placement' | 'pattern'
> & { label: string; enabled: boolean };
type RoundedFeatureExpectation = Pick<RoundedCutFeature, 'kind' | 'cutType' | 'target' | 'parameters' | 'placement'> & {
  label: string;
  enabled: boolean;
};
type PersistedFeature =
  | EndFeatureExpectation
  | RectFeatureExpectation
  | CircularFeatureExpectation
  | RoundedFeatureExpectation;

type OperationScenario = {
  title: string;
  preset: string;
  initial: PersistedFeature;
  edited: PersistedFeature;
  blindOnly?: boolean;
};

const CUSTOM_CUT_LIFECYCLE_SCENARIOS: OperationScenario[] = [
  {
    title: 'mitre end cut',
    preset: 'End Cut',
    initial: {
      kind: 'end_cut',
      cutType: 'mitre',
      target: { type: 'face', face: 'left_end' },
      label: 'Mitre lifecycle',
      enabled: true,
      parameters: { horizontalAngle: 31, horizontalFlip: true }
    },
    edited: {
      kind: 'end_cut',
      cutType: 'mitre',
      target: { type: 'face', face: 'right_end' },
      label: 'Mitre lifecycle revised',
      enabled: true,
      parameters: { horizontalAngle: 37, horizontalFlip: false }
    }
  },
  {
    title: 'bevel end cut',
    preset: 'End Cut',
    initial: {
      kind: 'end_cut',
      cutType: 'bevel',
      target: { type: 'face', face: 'left_end' },
      label: 'Bevel lifecycle',
      enabled: true,
      parameters: { horizontalAngle: 0, horizontalFlip: false, verticalAngle: 17, verticalFlip: true }
    },
    edited: {
      kind: 'end_cut',
      cutType: 'bevel',
      target: { type: 'face', face: 'right_end' },
      label: 'Bevel lifecycle revised',
      enabled: true,
      parameters: { horizontalAngle: 0, horizontalFlip: false, verticalAngle: 23, verticalFlip: false }
    }
  },
  {
    title: 'compound end cut',
    preset: 'End Cut',
    initial: {
      kind: 'end_cut',
      cutType: 'compound',
      target: { type: 'face', face: 'left_end' },
      label: 'Compound lifecycle',
      enabled: true,
      parameters: { horizontalAngle: 27, horizontalFlip: true, verticalAngle: 13, verticalFlip: true }
    },
    edited: {
      kind: 'end_cut',
      cutType: 'compound',
      target: { type: 'face', face: 'right_end' },
      label: 'Compound lifecycle revised',
      enabled: true,
      parameters: { horizontalAngle: 33, horizontalFlip: false, verticalAngle: 19, verticalFlip: false }
    }
  },
  {
    title: 'edge bevel',
    preset: 'Edge Bevel',
    initial: {
      kind: 'end_cut',
      cutType: 'bevel',
      target: { type: 'face', face: 'front_face' },
      label: 'Edge bevel lifecycle',
      enabled: true,
      parameters: { horizontalAngle: 0, horizontalFlip: false, verticalAngle: 21, verticalFlip: true }
    },
    edited: {
      kind: 'end_cut',
      cutType: 'bevel',
      target: { type: 'face', face: 'back_face' },
      label: 'Edge bevel lifecycle revised',
      enabled: true,
      parameters: { horizontalAngle: 0, horizontalFlip: false, verticalAngle: 28, verticalFlip: false }
    }
  },
  {
    title: 'tenon',
    preset: 'Tenon',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'tenon',
      target: { type: 'face', face: 'right_end' },
      label: 'Tenon lifecycle',
      enabled: true,
      parameters: { size: { length: 2, width: 4 }, depthMode: 'blind', depth: 0.375 },
      placement: { x: 0, z: 1 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'tenon',
      target: { type: 'face', face: 'left_end' },
      label: 'Tenon lifecycle revised',
      enabled: true,
      parameters: { size: { length: 3, width: 5 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 0, z: 2 }
    }
  },
  {
    title: 'half lap',
    preset: 'Half Lap',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'dado',
      target: { type: 'face', face: 'top_face' },
      label: 'Half Lap lifecycle',
      enabled: true,
      parameters: { size: { length: 3, width: 12 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 0, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'dado',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Half Lap lifecycle revised',
      enabled: true,
      parameters: { size: { length: 4, width: 12 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 0, z: 0 }
    }
  },
  {
    title: 'corner notch',
    preset: 'Corner Notch',
    initial: {
      kind: 'rect_cut',
      cutType: 'corner_notch',
      target: { type: 'corner', corner: 'front_left_corner' },
      label: 'Corner notch lifecycle',
      enabled: true,
      parameters: { size: { length: 2, width: 1 }, depthMode: 'through' },
      placement: { x: 0, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'corner_notch',
      target: { type: 'corner', corner: 'back_right_corner' },
      label: 'Corner notch lifecycle revised',
      enabled: true,
      parameters: { size: { length: 3, width: 1.5 }, depthMode: 'through' },
      placement: { x: 0, z: 0 }
    }
  },
  {
    title: 'edge notch',
    preset: 'Edge Notch',
    initial: {
      kind: 'rect_cut',
      cutType: 'edge_notch',
      target: { type: 'edge', edge: 'top_front_edge' },
      label: 'Edge notch lifecycle',
      enabled: true,
      parameters: { size: { length: 2, width: 1 }, depthMode: 'through' },
      placement: { x: 3, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'edge_notch',
      target: { type: 'edge', edge: 'top_back_edge' },
      label: 'Edge notch lifecycle revised',
      enabled: true,
      parameters: { size: { length: 3, width: 1.5 }, depthMode: 'through' },
      placement: { x: 5, z: 0 }
    }
  },
  {
    title: 'cutout',
    preset: 'Cutout',
    initial: {
      kind: 'rect_cut',
      cutType: 'cutout',
      target: { type: 'face', face: 'top_face' },
      label: 'Cutout lifecycle',
      enabled: true,
      parameters: { size: { length: 3, width: 2 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 2, z: 3 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'cutout',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Cutout lifecycle revised',
      enabled: true,
      parameters: { size: { length: 4, width: 2.5 }, depthMode: 'through' },
      placement: { x: 4, z: 4 }
    }
  },
  {
    title: 'dado',
    preset: 'Dado',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'dado',
      target: { type: 'face', face: 'top_face' },
      label: 'Dado lifecycle',
      enabled: true,
      parameters: { size: { length: 2, width: 12 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 0, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'dado',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Dado lifecycle revised',
      enabled: true,
      parameters: { size: { length: 3, width: 12 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 0, z: 0 }
    }
  },
  {
    title: 'stopped dado',
    preset: 'Stopped Dado',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'stopped_dado',
      target: { type: 'face', face: 'top_face' },
      label: 'Stopped dado lifecycle',
      enabled: true,
      parameters: { size: { length: 5, width: 12 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 2, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'stopped_dado',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Stopped dado lifecycle revised',
      enabled: true,
      parameters: { size: { length: 6, width: 12 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 4, z: 0 }
    }
  },
  {
    title: 'rabbet',
    preset: 'Rabbet',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'rabbet',
      target: { type: 'edge', edge: 'top_front_edge' },
      label: 'Rabbet lifecycle',
      enabled: true,
      parameters: { size: { length: 24, width: 1 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 0, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'rabbet',
      target: { type: 'edge', edge: 'bottom_back_edge' },
      label: 'Rabbet lifecycle revised',
      enabled: true,
      parameters: { size: { length: 24, width: 1.5 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 0, z: 0 }
    }
  },
  {
    title: 'groove',
    preset: 'Groove',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'groove',
      target: { type: 'face', face: 'top_face' },
      label: 'Groove lifecycle',
      enabled: true,
      parameters: { size: { length: 24, width: 1 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 0, z: 0 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'groove',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Groove lifecycle revised',
      enabled: true,
      parameters: { size: { length: 24, width: 1.5 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 0, z: 0 }
    }
  },
  {
    title: 'stopped groove',
    preset: 'Stopped Groove',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'stopped_groove',
      target: { type: 'face', face: 'top_face' },
      label: 'Stopped groove lifecycle',
      enabled: true,
      parameters: { size: { length: 6, width: 1 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 2, z: 3 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'stopped_groove',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Stopped groove lifecycle revised',
      enabled: true,
      parameters: { size: { length: 7, width: 1.5 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 4, z: 5 }
    }
  },
  {
    title: 'mortise',
    preset: 'Mortise',
    blindOnly: true,
    initial: {
      kind: 'rect_cut',
      cutType: 'mortise',
      target: { type: 'face', face: 'top_face' },
      label: 'Mortise lifecycle',
      enabled: true,
      parameters: { size: { length: 4, width: 2 }, depthMode: 'blind', depth: 0.25 },
      placement: { x: 3, z: 4 }
    },
    edited: {
      kind: 'rect_cut',
      cutType: 'mortise',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Mortise lifecycle revised',
      enabled: true,
      parameters: { size: { length: 5, width: 2.5 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 5, z: 5 }
    }
  },
  {
    title: 'round hole',
    preset: 'Round Hole',
    initial: {
      kind: 'circular_cut',
      cutType: 'round_hole',
      target: { type: 'face', face: 'top_face' },
      label: 'Round hole lifecycle',
      enabled: true,
      parameters: { diameter: 0.375, depthMode: 'blind', depth: 0.25, tilt: 7, direction: 30 },
      placement: { primary: 3, secondary: 3, rotation: 0 },
      pattern: { type: 'linear', count: 3, spacing: 1, direction: 15 }
    },
    edited: {
      kind: 'circular_cut',
      cutType: 'round_hole',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Round hole lifecycle revised',
      enabled: true,
      parameters: { diameter: 0.5, depthMode: 'through', tilt: 12, direction: 45 },
      placement: { primary: 5, secondary: 4, rotation: 0 },
      pattern: { type: 'linear', count: 4, spacing: 1.25, direction: 25 }
    }
  },
  {
    title: 'countersink',
    preset: 'Countersink',
    initial: {
      kind: 'circular_cut',
      cutType: 'countersink',
      target: { type: 'face', face: 'top_face' },
      label: 'Countersink lifecycle',
      enabled: true,
      parameters: {
        diameter: 0.25,
        depthMode: 'blind',
        depth: 0.375,
        tilt: 4,
        direction: 20,
        countersink: { majorDiameter: 0.75, includedAngle: 82 }
      },
      placement: { primary: 3, secondary: 3, rotation: 0 },
      pattern: { type: 'grid', rows: 2, columns: 3, rowSpacing: 1, columnSpacing: 1.25, rotation: 0 }
    },
    edited: {
      kind: 'circular_cut',
      cutType: 'countersink',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Countersink lifecycle revised',
      enabled: true,
      parameters: {
        diameter: 0.375,
        depthMode: 'through',
        tilt: 9,
        direction: 35,
        countersink: { majorDiameter: 0.875, includedAngle: 90 }
      },
      placement: { primary: 5, secondary: 2, rotation: 0 },
      pattern: { type: 'grid', rows: 3, columns: 2, rowSpacing: 1.25, columnSpacing: 1.5, rotation: 0 }
    }
  },
  {
    title: 'counterbore',
    preset: 'Counterbore',
    initial: {
      kind: 'circular_cut',
      cutType: 'counterbore',
      target: { type: 'face', face: 'top_face' },
      label: 'Counterbore lifecycle',
      enabled: true,
      parameters: {
        diameter: 0.25,
        depthMode: 'blind',
        depth: 0.25,
        tilt: 5,
        direction: 25,
        counterbore: { diameter: 0.75, depth: 0.125 }
      },
      placement: { primary: 4, secondary: 4, rotation: 0 },
      pattern: { type: 'circular', count: 3, radius: 1, startAngle: 15 }
    },
    edited: {
      kind: 'circular_cut',
      cutType: 'counterbore',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Counterbore lifecycle revised',
      enabled: true,
      parameters: {
        diameter: 0.375,
        depthMode: 'through',
        tilt: 10,
        direction: 40,
        counterbore: { diameter: 0.875, depth: 0.25 }
      },
      placement: { primary: 6, secondary: 4, rotation: 0 },
      pattern: { type: 'circular', count: 4, radius: 1.25, startAngle: 30 }
    }
  },
  {
    title: 'rounded slot',
    preset: 'Rounded Slot',
    initial: {
      kind: 'rounded_cut',
      cutType: 'rounded_slot',
      target: { type: 'face', face: 'top_face' },
      label: 'Rounded slot lifecycle',
      enabled: true,
      parameters: { length: 3, width: 1, cornerRadius: 0.5, depthMode: 'blind', depth: 0.25 },
      placement: { primary: 3, secondary: 3, rotation: 10 }
    },
    edited: {
      kind: 'rounded_cut',
      cutType: 'rounded_slot',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Rounded slot lifecycle revised',
      enabled: true,
      parameters: { length: 4, width: 1.5, cornerRadius: 0.75, depthMode: 'through' },
      placement: { primary: 5, secondary: 4, rotation: 20 }
    }
  },
  {
    title: 'rounded rectangle',
    preset: 'Rounded Rectangle',
    initial: {
      kind: 'rounded_cut',
      cutType: 'rounded_rectangle',
      target: { type: 'face', face: 'top_face' },
      label: 'Rounded rectangle lifecycle',
      enabled: true,
      parameters: { length: 3, width: 2, cornerRadius: 0.5, depthMode: 'blind', depth: 0.25 },
      placement: { primary: 3, secondary: 3, rotation: 10 }
    },
    edited: {
      kind: 'rounded_cut',
      cutType: 'rounded_rectangle',
      target: { type: 'face', face: 'bottom_face' },
      label: 'Rounded rectangle lifecycle revised',
      enabled: true,
      parameters: { length: 4, width: 2.5, cornerRadius: 0.75, depthMode: 'through' },
      placement: { primary: 5, secondary: 4, rotation: 20 }
    }
  }
];

const CUSTOM_CUT_FABRICATION_LINES: Record<string, string> = {
  'mitre end cut': '1. Mitre lifecycle revised — Mitre 37° on Right End · Long point on Front',
  'bevel end cut': '1. Bevel lifecycle revised — Bevel 23° bevel on Right End · High point on Top',
  'compound end cut':
    '1. Compound lifecycle revised — Compound 33° / 19° bevel on Right End · Long point on Front · High point on Top',
  'edge bevel': '1. Edge bevel lifecycle revised — Edge Bevel 28° on Back Edge · High point on Bottom',
  tenon:
    '1. Tenon lifecycle revised — Tenon on Left End · 3" long × 5" wide × 1/2" thick · Tongue starts 2" from Front; centered through thickness',
  'half lap': '1. Half Lap lifecycle revised — Dado on Bottom Face · 4" wide × 1/2" deep · 0" from Left; full width',
  'corner notch': '1. Corner notch lifecycle revised — Corner Notch on Back-Right Corner · 3" × 1 1/2" · Through',
  'edge notch':
    '1. Edge notch lifecycle revised — Edge Notch on Back Side · 3" × 1 1/2" · Through · 5" from Left along the selected edge',
  cutout: '1. Cutout lifecycle revised — Cutout on Bottom Face · 4" × 2 1/2" · Through · 4" from Left · 4" from Front',
  dado: '1. Dado lifecycle revised — Dado on Bottom Face · 3" wide × 1/2" deep · 0" from Left; full width',
  'stopped dado':
    '1. Stopped dado lifecycle revised — Stopped Dado on Bottom Face · 6" run × 1/2" deep · 4" from Left; full width',
  rabbet:
    '1. Rabbet lifecycle revised — Rabbet on Bottom-Back Edge · 1 1/2" shoulder × 1/2" deep · Full run along the selected edge',
  groove: '1. Groove lifecycle revised — Groove on Bottom Face · 1 1/2" wide × 1/2" deep · 0" from Front; full length',
  'stopped groove':
    '1. Stopped groove lifecycle revised — Stopped Groove on Bottom Face · 7" run × 1 1/2" wide × 1/2" deep · 4" from Left · 5" from Front',
  mortise:
    '1. Mortise lifecycle revised — Mortise on Bottom Face · 5" × 2 1/2" × 1/2" deep · 5" from Left · 5" from Front',
  'round hole':
    '1. Round hole lifecycle revised — 4-hole Linear Pattern on Bottom Face · 1/2" diameter · 1 1/4" spacing · 25° direction · Through · 12° tilt toward 45° · Primary 5" from center (+Right) · Secondary 4" from center (+Back) · Angles: 0° toward Right, 90° toward Back',
  countersink:
    '1. Countersink lifecycle revised — 6-hole Grid Countersink Pattern on Bottom Face · 3/8" hole × 7/8" major · 90° · 1 1/2" × 1 1/4" spacing · 0° rotation · Through · 9° tilt toward 35° · Primary 5" from center (+Right) · Secondary 2" from center (+Back) · 3 rows × 2 columns · Angles: 0° toward Right, 90° toward Back',
  counterbore:
    '1. Counterbore lifecycle revised — 4-hole Circular Counterbore Pattern on Bottom Face · 3/8" hole · 7/8" × 1/4" recess · 1 1/4" radius · 30° start angle · Through · 10° tilt toward 40° · Primary 6" from center (+Right) · Secondary 4" from center (+Back) · Angles: 0° toward Right, 90° toward Back',
  'rounded slot':
    '1. Rounded slot lifecycle revised — Rounded Slot on Bottom Face · 4" × 1 1/2" · Through · Primary 5" from center (+Right) · Secondary 4" from center (+Back) · 20° rotation · Angles: 0° toward Right, 90° toward Back',
  'rounded rectangle':
    '1. Rounded rectangle lifecycle revised — Rounded Rectangle on Bottom Face · 4" × 2 1/2" · 3/4" radius · Through · Primary 5" from center (+Right) · Secondary 4" from center (+Back) · 20° rotation · Angles: 0° toward Right, 90° toward Back'
};

const TARGET_LABELS: Record<string, string> = {
  left_end: 'Left End',
  right_end: 'Right End',
  top_face: 'Top Face',
  bottom_face: 'Bottom Face',
  front_face: 'Front Face',
  back_face: 'Back Face',
  front_left_corner: 'Front-Left Corner',
  front_right_corner: 'Front-Right Corner',
  back_left_corner: 'Back-Left Corner',
  back_right_corner: 'Back-Right Corner',
  top_front_edge: 'Top-Front Edge',
  top_back_edge: 'Top-Back Edge',
  bottom_back_edge: 'Bottom-Back Edge'
};

async function fillFraction(window: Page, label: string, value: number): Promise<void> {
  const input = window.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await expect(input).toHaveValue(String(value));
  await input.press('Enter');
}

async function selectFeatureTarget(window: Page, feature: PersistedFeature): Promise<void> {
  const label = featureTargetLabel(feature);
  const button = window.getByRole('button', { name: label, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

function featureTargetLabel(feature: PersistedFeature): string {
  const target = feature.target.face ?? feature.target.edge ?? feature.target.corner;
  return feature.kind === 'end_cut' && target === 'front_face'
    ? 'Front Edge'
    : feature.kind === 'end_cut' && target === 'back_face'
      ? 'Back Edge'
      : feature.kind === 'rect_cut' && feature.cutType === 'edge_notch'
        ? target.includes('front')
          ? 'Front'
          : target.includes('back')
            ? 'Back'
            : target.includes('left')
              ? 'Left'
              : 'Right'
        : TARGET_LABELS[target];
}

function parseImperialMeasurement(value: string): number {
  const [whole, fraction] = value.trim().split(/\s+/, 2);
  if (!fraction) {
    if (!whole.includes('/')) return Number(whole);
    const [numerator, denominator] = whole.split('/').map(Number);
    return numerator / denominator;
  }
  const [numerator, denominator] = fraction.split('/').map(Number);
  return Number(whole) + numerator / denominator;
}

async function expectFractionControl(window: Page, label: string, value: number): Promise<void> {
  const input = window.getByLabel(label, { exact: true });
  await expect.poll(async () => parseImperialMeasurement(await input.inputValue())).toBeCloseTo(value, 6);
}

async function expectFeatureControls(window: Page, feature: PersistedFeature): Promise<void> {
  await expect(window.getByLabel('Label (optional)', { exact: true })).toHaveValue(feature.label);
  await expect(window.getByRole('button', { name: featureTargetLabel(feature), exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  if (feature.kind === 'end_cut') {
    if (feature.target.face === 'left_end' || feature.target.face === 'right_end')
      await expect(window.getByLabel('Cut Style', { exact: true })).toHaveValue(feature.cutType);
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      await expect(window.getByLabel('Mitre Angle', { exact: true })).toHaveValue(
        String(feature.parameters.horizontalAngle)
      );
      await expect(window.getByLabel('Long Point On', { exact: true })).toHaveValue(
        feature.parameters.horizontalFlip ? 'back' : 'front'
      );
    }
    if (feature.cutType === 'bevel' || feature.cutType === 'compound') {
      await expect(window.getByLabel('Bevel Angle', { exact: true })).toHaveValue(
        String(feature.parameters.verticalAngle)
      );
      const highPointOnTop =
        feature.target.face === 'right_end' ? !feature.parameters.verticalFlip : !!feature.parameters.verticalFlip;
      await expect(window.getByLabel('High Point On', { exact: true })).toHaveValue(highPointOnTop ? 'top' : 'bottom');
    }
    return;
  }

  if (feature.kind === 'circular_cut') {
    await expectFractionControl(window, 'Hole Diameter', feature.parameters.diameter as number);
    await expect(window.getByLabel('Depth', { exact: true })).toHaveValue(feature.parameters.depthMode as string);
    if (feature.parameters.depthMode === 'blind')
      await expectFractionControl(window, 'Hole Depth', feature.parameters.depth as number);
    await expect(window.getByLabel('Tilt From Square (degrees)', { exact: true })).toHaveValue(
      String(feature.parameters.tilt)
    );
    await expect(window.getByLabel('Tilt Toward (degrees)', { exact: true })).toHaveValue(
      String(feature.parameters.direction)
    );
    if (feature.cutType === 'countersink') {
      const countersink = feature.parameters.countersink as { majorDiameter: number; includedAngle: number };
      await expectFractionControl(window, 'Countersink Major Diameter', countersink.majorDiameter);
      await expect(window.getByLabel('Included Angle', { exact: true })).toHaveValue(String(countersink.includedAngle));
    }
    if (feature.cutType === 'counterbore') {
      const counterbore = feature.parameters.counterbore as { diameter: number; depth: number };
      await expectFractionControl(window, 'Counterbore Diameter', counterbore.diameter);
      await expectFractionControl(window, 'Counterbore Depth', counterbore.depth);
    }
    await expectFractionControl(window, 'Offset Along Face', feature.placement!.primary);
    await expectFractionControl(window, 'Offset Across Face', feature.placement!.secondary);
    await expect(window.getByLabel('Repeating Pattern', { exact: true })).toHaveValue(
      (feature.pattern?.type as string) ?? 'none'
    );
    if (feature.pattern?.type === 'linear') {
      await expect(window.getByLabel('Hole Count', { exact: true })).toHaveValue(String(feature.pattern.count));
      await expectFractionControl(window, 'Spacing', feature.pattern.spacing as number);
      await expect(window.getByLabel('Direction', { exact: true })).toHaveValue(String(feature.pattern.direction));
    } else if (feature.pattern?.type === 'grid') {
      await expect(window.getByLabel('Rows', { exact: true })).toHaveValue(String(feature.pattern.rows));
      await expect(window.getByLabel('Columns', { exact: true })).toHaveValue(String(feature.pattern.columns));
      await expectFractionControl(window, 'Row Spacing', feature.pattern.rowSpacing as number);
      await expectFractionControl(window, 'Column Spacing', feature.pattern.columnSpacing as number);
    } else if (feature.pattern?.type === 'circular') {
      await expect(window.getByLabel('Hole Count', { exact: true })).toHaveValue(String(feature.pattern.count));
      await expectFractionControl(window, 'Pattern Radius', feature.pattern.radius as number);
      await expect(window.getByLabel('Start Angle', { exact: true })).toHaveValue(String(feature.pattern.startAngle));
    }
    return;
  }

  if (feature.kind === 'rounded_cut') {
    await expectFractionControl(window, 'Opening Length', feature.parameters.length as number);
    await expectFractionControl(window, 'Opening Width', feature.parameters.width as number);
    if (feature.cutType === 'rounded_rectangle')
      await expectFractionControl(window, 'Corner Radius', feature.parameters.cornerRadius as number);
    await expect(window.getByLabel('Depth', { exact: true })).toHaveValue(feature.parameters.depthMode as string);
    if (feature.parameters.depthMode === 'blind')
      await expectFractionControl(window, 'Opening Depth', feature.parameters.depth as number);
    await expect(window.getByLabel('Rotation (degrees)', { exact: true })).toHaveValue(
      String(feature.placement!.rotation)
    );
    await expectFractionControl(window, 'Offset Along Face', feature.placement!.primary);
    await expectFractionControl(window, 'Offset Across Face', feature.placement!.secondary);
    return;
  }

  const size = feature.parameters.size as { length: number; width: number };
  if (feature.cutType === 'tenon') {
    await expectFractionControl(window, 'Tenon Length', size.length);
    await expectFractionControl(window, 'Tenon Width', size.width);
    await expectFractionControl(window, 'Tenon Thickness', feature.parameters.depth as number);
    await expectFractionControl(window, 'Shoulder Offset', feature.placement!.z);
  } else if (feature.cutType === 'rabbet') {
    await expectFractionControl(window, 'Shoulder Width', size.width);
    await expectFractionControl(window, 'Blind Depth', feature.parameters.depth as number);
  } else if (feature.cutType === 'groove') {
    await expectFractionControl(window, 'Groove Width', size.width);
    await expectFractionControl(window, 'Blind Depth', feature.parameters.depth as number);
  } else {
    await expectFractionControl(window, 'Run Along Blank', size.length);
    if (!['dado', 'stopped_dado'].includes(feature.cutType))
      await expectFractionControl(window, 'Cross-Cut Width', size.width);
    if (feature.parameters.depthMode === 'blind')
      await expectFractionControl(window, 'Blind Depth', feature.parameters.depth as number);
    if (feature.cutType === 'edge_notch')
      await expectFractionControl(window, 'Offset Along Length', feature.placement!.x);
    if (['cutout', 'stopped_dado', 'stopped_groove', 'mortise'].includes(feature.cutType)) {
      await expectFractionControl(window, 'Offset Along Length', feature.placement!.x);
      if (feature.cutType !== 'stopped_dado')
        await expectFractionControl(window, 'Offset Across Width', feature.placement!.z);
    }
  }
}

async function applyFeatureControls(window: Page, feature: PersistedFeature): Promise<void> {
  await selectFeatureTarget(window, feature);
  await window.getByLabel('Label (optional)', { exact: true }).fill(feature.label);

  if (feature.kind === 'end_cut') {
    if (feature.target.face === 'left_end' || feature.target.face === 'right_end')
      await window.getByLabel('Cut Style', { exact: true }).selectOption(feature.cutType);
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      await window.getByLabel('Mitre Angle', { exact: true }).fill(String(feature.parameters.horizontalAngle));
      await window
        .getByLabel('Long Point On', { exact: true })
        .selectOption(feature.parameters.horizontalFlip ? 'back' : 'front');
    }
    if (feature.cutType === 'bevel' || feature.cutType === 'compound') {
      await window.getByLabel('Bevel Angle', { exact: true }).fill(String(feature.parameters.verticalAngle));
      const face = feature.target.face!;
      const highPointOnTop =
        face === 'right_end' ? !feature.parameters.verticalFlip : !!feature.parameters.verticalFlip;
      await window.getByLabel('High Point On', { exact: true }).selectOption(highPointOnTop ? 'top' : 'bottom');
    }
    return;
  }

  if (feature.kind === 'circular_cut') {
    await fillFraction(window, 'Hole Diameter', feature.parameters.diameter as number);
    await window.getByLabel('Depth', { exact: true }).selectOption(feature.parameters.depthMode as string);
    if (feature.parameters.depthMode === 'blind')
      await fillFraction(window, 'Hole Depth', feature.parameters.depth as number);
    await window.getByLabel('Tilt From Square (degrees)', { exact: true }).fill(String(feature.parameters.tilt));
    await window.getByLabel('Tilt Toward (degrees)', { exact: true }).fill(String(feature.parameters.direction));
    if (feature.cutType === 'countersink') {
      const countersink = feature.parameters.countersink as { majorDiameter: number; includedAngle: number };
      await fillFraction(window, 'Countersink Major Diameter', countersink.majorDiameter);
      await window.getByLabel('Included Angle', { exact: true }).fill(String(countersink.includedAngle));
    }
    if (feature.cutType === 'counterbore') {
      const counterbore = feature.parameters.counterbore as { diameter: number; depth: number };
      await fillFraction(window, 'Counterbore Diameter', counterbore.diameter);
      await fillFraction(window, 'Counterbore Depth', counterbore.depth);
    }
    await fillFraction(window, 'Offset Along Face', feature.placement!.primary);
    await fillFraction(window, 'Offset Across Face', feature.placement!.secondary);
    await window
      .getByLabel('Repeating Pattern', { exact: true })
      .selectOption((feature.pattern?.type as string) ?? 'none');
    if (feature.pattern?.type === 'linear') {
      await window.getByLabel('Hole Count', { exact: true }).fill(String(feature.pattern.count));
      await fillFraction(window, 'Spacing', feature.pattern.spacing as number);
      await window.getByLabel('Direction', { exact: true }).fill(String(feature.pattern.direction));
    } else if (feature.pattern?.type === 'grid') {
      await window.getByLabel('Rows', { exact: true }).fill(String(feature.pattern.rows));
      await window.getByLabel('Columns', { exact: true }).fill(String(feature.pattern.columns));
      await fillFraction(window, 'Row Spacing', feature.pattern.rowSpacing as number);
      await fillFraction(window, 'Column Spacing', feature.pattern.columnSpacing as number);
    } else if (feature.pattern?.type === 'circular') {
      await window.getByLabel('Hole Count', { exact: true }).fill(String(feature.pattern.count));
      await fillFraction(window, 'Pattern Radius', feature.pattern.radius as number);
      await window.getByLabel('Start Angle', { exact: true }).fill(String(feature.pattern.startAngle));
    }
    return;
  }

  if (feature.kind === 'rounded_cut') {
    await fillFraction(window, 'Opening Length', feature.parameters.length as number);
    await fillFraction(window, 'Opening Width', feature.parameters.width as number);
    if (feature.cutType === 'rounded_rectangle')
      await fillFraction(window, 'Corner Radius', feature.parameters.cornerRadius as number);
    await window.getByLabel('Depth', { exact: true }).selectOption(feature.parameters.depthMode as string);
    if (feature.parameters.depthMode === 'blind')
      await fillFraction(window, 'Opening Depth', feature.parameters.depth as number);
    await window.getByLabel('Rotation (degrees)', { exact: true }).fill(String(feature.placement!.rotation));
    await fillFraction(window, 'Offset Along Face', feature.placement!.primary);
    await fillFraction(window, 'Offset Across Face', feature.placement!.secondary);
    return;
  }

  const size = feature.parameters.size as { length: number; width: number };
  const depthMode = feature.parameters.depthMode as string;
  if (await window.getByLabel('Depth', { exact: true }).count())
    await window.getByLabel('Depth', { exact: true }).selectOption(depthMode);
  if (feature.cutType === 'tenon') {
    await fillFraction(window, 'Tenon Length', size.length);
    await fillFraction(window, 'Tenon Width', size.width);
    await fillFraction(window, 'Tenon Thickness', feature.parameters.depth as number);
    await fillFraction(window, 'Shoulder Offset', feature.placement!.z);
  } else if (feature.cutType === 'rabbet') {
    await fillFraction(window, 'Shoulder Width', size.width);
    await fillFraction(window, 'Blind Depth', feature.parameters.depth as number);
  } else if (feature.cutType === 'groove') {
    await fillFraction(window, 'Groove Width', size.width);
    await fillFraction(window, 'Blind Depth', feature.parameters.depth as number);
  } else {
    await fillFraction(window, 'Run Along Blank', size.length);
    if (!['dado', 'stopped_dado'].includes(feature.cutType)) await fillFraction(window, 'Cross-Cut Width', size.width);
    if (depthMode === 'blind') await fillFraction(window, 'Blind Depth', feature.parameters.depth as number);
    if (feature.cutType === 'edge_notch') await fillFraction(window, 'Offset Along Length', feature.placement!.x);
    if (['cutout', 'stopped_dado', 'stopped_groove', 'mortise'].includes(feature.cutType)) {
      await fillFraction(window, 'Offset Along Length', feature.placement!.x);
      if (feature.cutType !== 'stopped_dado') await fillFraction(window, 'Offset Across Width', feature.placement!.z);
    }
  }
}

async function persistedFirstFeature(window: Page): Promise<PersistedFeature | null> {
  return window.evaluate(() => {
    const feature = window.useProjectStore.getState().parts[0]?.features?.[0];
    if (!feature) return null;
    const result: Record<string, unknown> = {
      kind: feature.kind,
      cutType: feature.cutType,
      target: feature.target,
      parameters: Object.fromEntries(Object.entries(feature.parameters).filter(([, value]) => value !== undefined)),
      label: feature.label ?? '',
      enabled: feature.enabled
    };
    if (feature.kind !== 'end_cut') result.placement = feature.placement;
    if (feature.kind === 'circular_cut' && feature.pattern) result.pattern = feature.pattern;
    return result;
  });
}

async function firstPartFeatureSnapshot(window: Page): Promise<unknown | null> {
  return window.evaluate(() => {
    const feature = window.useProjectStore.getState().parts[0]?.features?.[0];
    return feature ? JSON.parse(JSON.stringify(feature)) : null;
  });
}

async function firstDraftFeatureSnapshot(window: Page): Promise<unknown | null> {
  return window.evaluate(() => {
    const feature = window.usePartCutsEditingStore.getState().draftFeatures?.[0];
    return feature ? JSON.parse(JSON.stringify(feature)) : null;
  });
}

async function draftFeatureSnapshots(window: Page): Promise<Array<Record<string, unknown>>> {
  return window.evaluate(() =>
    window.usePartCutsEditingStore
      .getState()
      .draftFeatures.map((feature) => JSON.parse(JSON.stringify(feature)) as Record<string, unknown>)
  );
}

async function previewGeometrySignature(window: Page): Promise<string> {
  const signature = await window
    .getByRole('img', { name: 'Part cuts geometry preview' })
    .getAttribute('data-geometry-signature');
  if (!signature) throw new Error('Part Cuts preview did not expose a geometry signature.');
  return signature;
}

async function savePartAndReopen(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Save Part' }).click();
  await expect.poll(() => isEditingPartCuts(window)).toBe(false);
  await openPartCutsFromProperties(window);
}

async function prepareLifecycleStockedPart(window: Page): Promise<void> {
  await seedProject(window, 'stocked-one-part');
  await window.evaluate(async () => {
    const project = window.useProjectStore.getState();
    const part = project.parts[0];
    project.updatePart(part.id, { width: 12 });
    await window.electronAPI.setPreference('stockLibrary', project.stocks);
  });
}

async function saveAndNativeReopen(window: Page, projectPath: string, expectedFeature: unknown): Promise<void> {
  if (!fs.existsSync(projectPath)) await queueSavePath(window, projectPath);
  await pressSaveShortcut(window);
  await expect
    .poll(() => {
      try {
        const saved = JSON.parse(fs.readFileSync(projectPath, 'utf8')) as { parts: Array<{ features?: unknown[] }> };
        return saved.parts[0].features;
      } catch {
        return null;
      }
    })
    .toEqual([expectedFeature]);

  await window.getByRole('button', { name: 'Carvd Studio home' }).click();
  await expect(window.locator('.start-screen')).toBeVisible();
  await queueOpenPaths(window, [projectPath]);
  await window.getByRole('button', { name: 'Open file...' }).click();
  await expect(window.locator('canvas')).toBeVisible();
  await expect.poll(() => firstPartFeatureSnapshot(window)).toEqual(expectedFeature);
}

async function expectSingleFabricationLine(window: Page, scenario: OperationScenario): Promise<void> {
  const expectedLine = CUSTOM_CUT_FABRICATION_LINES[scenario.title];
  if (!expectedLine) throw new Error(`Missing fabrication oracle for ${scenario.title}.`);

  await window.getByRole('button', { name: /Generate Cut List|Regenerate Cut List|View Cut List/ }).click();
  const dialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
  await dialog.getByRole('button', { name: /Generate Cut List|Regenerate/ }).click();
  const operationSummary = dialog
    .locator('.cut-list-parts-tab tbody tr')
    .first()
    .locator('td')
    .last()
    .locator('span.italic');
  await expect(operationSummary).toHaveText(expectedLine);
  await dialog.getByRole('button', { name: 'Done' }).click();
}

async function qualifyOperationLifecycle(
  window: Page,
  scenario: OperationScenario,
  projectPath: string
): Promise<void> {
  await window.getByRole('button', { name: '+ Add Cut' }).click();
  await window.getByRole('button', { name: new RegExp(`^${scenario.preset}\\b`) }).click();
  if (scenario.blindOnly) await expect(window.getByLabel('Depth', { exact: true })).toHaveCount(0);
  await applyFeatureControls(window, scenario.initial);
  await expectFeatureControls(window, scenario.initial);
  await window.getByRole('button', { name: 'Save Cut' }).click();

  // Persist disabled state, then restore enabled state as part of the edited lifecycle.
  const enabledToggle = window.getByRole('checkbox', { name: 'Enable cut 1' });
  await enabledToggle.uncheck();
  await expect(enabledToggle).not.toBeChecked();
  await savePartAndReopen(window);
  const initiallyDisabled = { ...scenario.initial, enabled: false };
  await expect.poll(() => persistedFirstFeature(window)).toEqual(initiallyDisabled);
  await expect(enabledToggle).not.toBeChecked();

  await window.getByRole('button', { name: new RegExp(`^1\\. ${scenario.initial.label}`) }).click();
  await expectFeatureControls(window, initiallyDisabled);
  await window.getByRole('button', { name: 'Back to Cuts' }).click();
  await enabledToggle.check();
  await expect(enabledToggle).toBeChecked();
  await window.getByRole('button', { name: new RegExp(`^1\\. ${scenario.initial.label}`) }).click();
  await applyFeatureControls(window, scenario.edited);
  await expectFeatureControls(window, scenario.edited);
  await window.getByRole('button', { name: 'Save Cut' }).click();
  await window.getByRole('button', { name: 'Save Part' }).click();
  await expect.poll(() => isEditingPartCuts(window)).toBe(false);
  await expect.poll(() => persistedFirstFeature(window)).toEqual(scenario.edited);
  await expect.poll(() => getFirstPartFeatureCount(window)).toBe(1);
  const editedFeature = await firstPartFeatureSnapshot(window);
  expect(editedFeature).not.toBeNull();
  await saveAndNativeReopen(window, projectPath, editedFeature);
  await expect.poll(() => persistedFirstFeature(window)).toEqual(scenario.edited);
  await expectSingleFabricationLine(window, scenario);
  await openPartCutsFromProperties(window);

  await window.getByRole('button', { name: new RegExp(`^1\\. ${scenario.edited.label}`) }).click();
  await expectFeatureControls(window, scenario.edited);
  await window.getByRole('button', { name: 'Back to Cuts' }).click();
  await expect.poll(() => firstDraftFeatureSnapshot(window)).toEqual(editedFeature);
  const geometryBeforeDelete = await previewGeometrySignature(window);

  // Exercise the user-facing duplicate action for every operation family and
  // prove the copy preserves all authored values while receiving a fresh ID.
  const sourceBeforeDuplicate = (await draftFeatureSnapshots(window))[0];
  await window.getByRole('button', { name: 'Actions for cut 1' }).click();
  await window.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect.poll(async () => (await draftFeatureSnapshots(window)).length).toBe(2);
  const [sourceAfterDuplicate, duplicate] = await draftFeatureSnapshots(window);
  const { id: sourceId, ...sourceWithoutId } = sourceAfterDuplicate;
  const { id: duplicateId, ...duplicateWithoutId } = duplicate;
  expect(sourceId).toBe(sourceBeforeDuplicate.id);
  expect(duplicateId).not.toBe(sourceId);
  expect(duplicateWithoutId).toEqual(sourceWithoutId);
  await window
    .getByLabel(/^Part cuts for /)
    .getByRole('button', { name: 'Cancel' })
    .click();
  await window.getByRole('button', { name: 'Actions for cut 2' }).click();
  await window.getByRole('menuitem', { name: 'Delete' }).click();
  await expect.poll(async () => (await draftFeatureSnapshots(window)).length).toBe(1);
  await expect.poll(() => firstDraftFeatureSnapshot(window)).toEqual(editedFeature);

  await window.getByRole('button', { name: 'Actions for cut 1' }).click();
  await window.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(window.getByText(scenario.edited.label)).toHaveCount(0);
  await expect.poll(() => firstDraftFeatureSnapshot(window)).toBeNull();
  const geometryAfterDelete = await previewGeometrySignature(window);
  expect(geometryAfterDelete).not.toBe(geometryBeforeDelete);
  await window.getByRole('button', { name: 'Undo cut change' }).click();
  await expect(window.getByText(scenario.edited.label)).toBeVisible();
  await expect.poll(() => firstDraftFeatureSnapshot(window)).toEqual(editedFeature);
  await expect.poll(() => previewGeometrySignature(window)).toBe(geometryBeforeDelete);
  await window.getByRole('button', { name: 'Redo cut change' }).click();
  await expect(window.getByText(scenario.edited.label)).toHaveCount(0);
  await expect.poll(() => firstDraftFeatureSnapshot(window)).toBeNull();
  await expect.poll(() => previewGeometrySignature(window)).toBe(geometryAfterDelete);
  await window.getByRole('button', { name: 'Save Part' }).click();
  await expect.poll(() => getFirstPartFeatureCount(window)).toBe(0);
  await expect.poll(() => firstPartFeatureSnapshot(window)).toBeNull();
}

test.describe('part cuts editing lifecycle', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Part Cuts Lifecycle E2E');
    await addPartFromSidebar(running.window);
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test.describe('complete custom-cut author, edit, delete, and draft-history matrix', () => {
    const scenarioGroups = [
      ['end operations', (scenario: OperationScenario) => scenario.initial.kind === 'end_cut'],
      ['rectangular operations', (scenario: OperationScenario) => scenario.initial.kind === 'rect_cut'],
      ['circular operations', (scenario: OperationScenario) => scenario.initial.kind === 'circular_cut'],
      ['rounded operations', (scenario: OperationScenario) => scenario.initial.kind === 'rounded_cut']
    ] as const;

    for (const [group, includes] of scenarioGroups) {
      test(`qualifies ${group} through real Part Cuts controls`, async () => {
        // A group deliberately covers every operation in its family through
        // its own native project save/close/reopen and fabrication-output
        // cycle. The rectangular family performs eleven such round trips.
        test.setTimeout(600000);
        const { window, userDataDir } = running;
        await prepareLifecycleStockedPart(window);
        const projectPath = path.join(userDataDir, `${group.replaceAll(' ', '-')}-lifecycle.carvd`);
        await openPartCutsFromProperties(window);
        const scenarios = CUSTOM_CUT_LIFECYCLE_SCENARIOS.filter(includes);
        for (const [index, scenario] of scenarios.entries()) {
          await test.step(scenario.title, () => qualifyOperationLifecycle(window, scenario, projectPath));
          // The save above returns to the project. Each scenario starts from a
          // fresh Part Cuts session so its undo/redo assertion is one logical operation.
          if (index < scenarios.length - 1) {
            await openPartCutsFromProperties(window);
          }
        }
      });
    }
  });

  test('adds a dado in the cuts workspace and saves it to the part', async () => {
    const { window } = running;

    await openPartCutsFromProperties(window);
    await addDadoCut(window);

    // The saved cut shows up in the cuts list with its numbered summary.
    await expect(window.getByText(/^1\./)).toBeVisible();

    await window.getByRole('button', { name: 'Save Part' }).click();

    await expect.poll(() => isEditingPartCuts(window), { timeout: 5000 }).toBe(false);
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(1);
    await expect(window.locator('.header-mode-chip', { hasText: 'Part Cuts' })).toHaveCount(0);
  });

  test('prompts before discarding unsaved cut changes', async () => {
    const { window } = running;

    await openPartCutsFromProperties(window);
    await addDadoCut(window);

    await window.getByRole('button', { name: 'Back to Project' }).click();
    const exitDialog = window.getByRole('alertdialog', { name: 'Save Part Cuts?' });
    await expect(exitDialog).toBeVisible();

    // Keep editing: the workspace stays open and the draft survives.
    await exitDialog.getByRole('button', { name: 'Keep Editing' }).click();
    await expect(exitDialog).toHaveCount(0);
    expect(await isEditingPartCuts(window)).toBe(true);

    // Discard: the workspace closes and no features reach the part.
    await window.getByRole('button', { name: 'Back to Project' }).click();
    await window.getByRole('alertdialog', { name: 'Save Part Cuts?' }).getByRole('button', { name: 'Discard' }).click();

    await expect.poll(() => isEditingPartCuts(window), { timeout: 5000 }).toBe(false);
    expect(await getFirstPartFeatureCount(window)).toBe(0);
  });

  test('project shortcuts cannot reach the part being edited', async () => {
    const { window } = running;

    await openPartCutsFromProperties(window);

    const rotationBefore = await window.evaluate(() => window.useProjectStore.getState().parts[0].rotation);

    // Delete / duplicate / rotate are project-level shortcuts; while the cuts
    // workspace is open they must not touch the part behind it.
    await window.keyboard.press('Delete');
    await window.keyboard.press('x');
    await window.keyboard.press('Shift+D');

    expect(await getPartCount(window)).toBe(1);
    expect(await window.evaluate(() => window.useProjectStore.getState().parts[0].rotation)).toEqual(rotationBefore);
    expect(await window.evaluate(() => window.useUIStore.getState().pendingDeletePartIds)).toBeNull();
    expect(await isEditingPartCuts(window)).toBe(true);
  });

  test('persists custom cuts through a project save and reload', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'part-cuts-persistence.carvd');

    await openPartCutsFromProperties(window);
    await addDadoCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();
    await queueSavePath(window, projectPath);
    await pressSaveShortcut(window);

    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);
    const saved = JSON.parse(fs.readFileSync(projectPath, 'utf8')) as {
      version: number;
      parts: Array<{ features?: Array<{ kind: string; cutType: string }> }>;
    };
    expect(saved.version).toBe(2);
    expect(saved.parts[0].features).toEqual([expect.objectContaining({ kind: 'rect_cut', cutType: 'dado' })]);

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await queueOpenPaths(window, [projectPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(1);

    await openPartCutsFromProperties(window);
    await expect(window.getByText(/^1\./)).toBeVisible();
  });

  test('authors mortise-and-tenon operations through the real cuts controls', async () => {
    const { window } = running;
    await openPartCutsFromProperties(window);
    await addPresetCut(window, 'Tenon');
    await addPresetCut(window, 'Mortise');
    await window.getByRole('button', { name: 'Save Part' }).click();

    await expect.poll(() => getFirstPartFeatureCount(window)).toBe(2);
    expect((await getFirstPartFeatures(window)).map((feature) => feature.cutType)).toEqual(['tenon', 'mortise']);
  });

  test('blocks conflicting duplicate end cuts and keeps the workspace open', async () => {
    const { window } = running;
    await openPartCutsFromProperties(window);
    await addPresetCut(window, 'End Cut');
    await addPresetCut(window, 'End Cut');

    await expect(window.getByText(/Only one enabled cut per end or edge/i).first()).toBeVisible();
    await expect(window.getByRole('button', { name: 'Save Part' })).toBeDisabled();
    expect(await isEditingPartCuts(window)).toBe(true);
  });

  test('copies cuts to another part with independent feature ids', async () => {
    const { window } = running;
    await openPartCutsFromProperties(window);
    await addDadoCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();
    await addPartFromSidebar(window);

    await window.evaluate(() => {
      const source = window.useProjectStore.getState().parts[0];
      window.useSelectionStore.getState().selectPart(source.id);
    });
    const sourceBefore = await window.evaluate(() =>
      JSON.stringify(window.useProjectStore.getState().parts[0].features)
    );
    await openSelectionContextMenu(window);
    await clickMenuItem(window, 'Copy Cuts');
    await window.evaluate(() => {
      const target = window.useProjectStore.getState().parts[1];
      window.useSelectionStore.getState().selectPart(target.id);
    });
    await openSelectionContextMenu(window);
    await window.getByRole('menuitem', { name: /^Paste Cuts/ }).click();
    await expect
      .poll(async () => window.evaluate(() => window.useProjectStore.getState().parts[1].features?.length))
      .toBe(1);

    const result = await window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      return {
        sourceIds: parts[0].features?.map((feature) => feature.id) ?? [],
        targetIds: parts[1].features?.map((feature) => feature.id) ?? [],
        targetTypes: parts[1].features?.map((feature) => feature.kind === 'rect_cut' && feature.cutType) ?? []
      };
    });

    expect(result.targetTypes).toEqual(['dado']);
    expect(result.targetIds).toHaveLength(1);
    expect(result.targetIds[0]).not.toBe(result.sourceIds[0]);

    // Edit the pasted operation through its real Part Cuts inspector. The
    // source payload is serialized before the clipboard action and must stay
    // byte-for-byte unchanged after the target is edited and saved.
    await window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await window.getByRole('button', { name: /^1\./ }).click();
    await window.getByLabel('Label (optional)').fill('Pasted dado only');
    await window.getByRole('button', { name: 'Save Cut' }).click();
    await window.getByRole('button', { name: 'Save Part' }).click();
    expect(await window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features))).toBe(
      sourceBefore
    );
    expect(await window.evaluate(() => window.useProjectStore.getState().parts[1].features?.[0].label)).toBe(
      'Pasted dado only'
    );
  });

  test('shows saved operations in fabrication output', async () => {
    const { window } = running;
    await seedProject(window, 'stocked-one-part');
    await openPartCutsFromProperties(window);
    await addDadoCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();

    await window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
    const dialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
    await dialog.getByRole('button', { name: 'Generate Cut List' }).click();
    await expect(dialog.getByText(/Cut blanks first/i)).toBeVisible();
    await expect(dialog.getByText(/Dado/i)).toBeVisible();
  });

  test('round-trips mixed featured-part state and exports its enabled fabrication operations', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'mixed-featured-part.carvd');
    const csvPath = path.join(userDataDir, 'mixed-featured-part.csv');
    const pdfPath = path.join(userDataDir, 'mixed-featured-part.pdf');
    await seedProject(window, 'stocked-one-part');

    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      const part = project.parts[0];
      project.updatePart(part.id, {
        name: 'Mixed featured rail',
        rotation: { x: 15, y: 30, z: 45 },
        features: [
          {
            id: 'mixed-mitre',
            kind: 'end_cut',
            version: 1,
            enabled: true,
            label: 'Angled left end',
            target: { type: 'face', face: 'left_end' },
            reference: { primaryFrom: 'min' },
            cutType: 'mitre',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 33, horizontalFlip: true }
          },
          {
            id: 'mixed-dado',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            label: 'Shelf dado',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'min', secondaryFrom: 'min' },
            cutType: 'dado',
            placement: { x: 6, z: 0 },
            parameters: { size: { length: 0.75, width: 4 }, depthMode: 'blind', depth: 0.375 }
          },
          {
            id: 'mixed-holes',
            kind: 'circular_cut',
            version: 1,
            enabled: true,
            label: 'Three patterned holes',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'center', secondaryFrom: 'center' },
            cutType: 'round_hole',
            placement: { primary: -8, secondary: -3, rotation: 0 },
            pattern: { type: 'linear', count: 3, spacing: 0.75, direction: 20 },
            parameters: { diameter: 0.25, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 }
          },
          {
            id: 'mixed-slot',
            kind: 'rounded_cut',
            version: 1,
            enabled: true,
            label: 'Rounded relief',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'center', secondaryFrom: 'center' },
            cutType: 'rounded_slot',
            placement: { primary: 8, secondary: 3, rotation: 30 },
            parameters: { length: 3, width: 0.5, cornerRadius: 0.25, depthMode: 'through' }
          },
          {
            id: 'mixed-disabled',
            kind: 'rect_cut',
            version: 1,
            enabled: false,
            label: 'Disabled cutout',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'min', secondaryFrom: 'min' },
            cutType: 'cutout',
            placement: { x: 18, z: 0 },
            parameters: { size: { length: 1, width: 1 }, depthMode: 'through' }
          }
        ]
      });
    });
    const expected = await window.evaluate(() => {
      const part = window.useProjectStore.getState().parts[0];
      return JSON.stringify({ name: part.name, rotation: part.rotation, features: part.features });
    });

    await queueSavePath(window, projectPath);
    await pressSaveShortcut(window);
    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);
    // The first file-path transition checks this fixture's non-library stock
    // after saving. Complete that prompt before leaving, rather than racing
    // its delayed appearance with the Home click.
    const importDialog = window.getByRole('dialog', { name: 'Import to Library' });
    await importDialog.getByRole('button', { name: 'Skip' }).click();
    await expect(importDialog).toBeHidden();
    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await queueOpenPaths(window, [projectPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await importDialog.getByRole('button', { name: 'Skip' }).click();
    await expect
      .poll(async () =>
        window.evaluate(() => {
          const part = window.useProjectStore.getState().parts[0];
          return JSON.stringify({ name: part.name, rotation: part.rotation, features: part.features });
        })
      )
      .toBe(expected);

    await window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
    const dialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
    await dialog.getByRole('button', { name: 'Generate Cut List' }).click();
    const fabricationLines = [
      '1. Angled left end — Mitre 33° on Left End · Long point on Back',
      '2. Shelf dado — Dado on Top Face · 3/4" wide × 3/8" deep · 6" from Left; full width',
      '3. Three patterned holes — 3-hole Linear Pattern on Top Face · 1/4" diameter · 3/4" spacing · 20° direction · 1/2" deep · Primary -8" from center (+Right) · Secondary -3" from center (+Front) · Angles: 0° toward Right, 90° toward Front',
      '4. Rounded relief — Rounded Slot on Top Face · 3" × 1/2" · Through · Primary 8" from center (+Right) · Secondary 3" from center (+Front) · 30° rotation · Angles: 0° toward Right, 90° toward Front'
    ];
    for (const line of fabricationLines) {
      await expect(dialog.getByText(line)).toBeVisible();
    }
    await expect(dialog.getByText('Disabled cutout')).toHaveCount(0);

    await queueSavePath(window, csvPath);
    await dialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download' }).click();
    await window.getByRole('menuitem', { name: 'Download CSV' }).click();
    await expect
      .poll(() => (fs.existsSync(csvPath) ? fs.statSync(csvPath).size : 0), { timeout: 5000 })
      .toBeGreaterThan(0);
    const csv = fs.readFileSync(csvPath, 'utf8');
    for (const line of fabricationLines) expect(csv).toContain(line.replaceAll('"', '""'));
    expect(csv).not.toContain('Disabled cutout');

    await queueSavePath(window, pdfPath);
    await dialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download' }).click();
    await window.getByRole('menuitem', { name: 'Download PDF' }).click();
    await expect
      .poll(() => (fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0), { timeout: 5000 })
      .toBeGreaterThan(0);
    // Extract the actual jsPDF text operators. This proves the exported
    // artifact carries complete fabrication details, even when jsPDF wraps a
    // long operation onto multiple text operators.
    const pdfText = extractJsPdfLiteralText(pdfPath);
    const pdfFabricationLines = fabricationLines.map((line) =>
      line.replaceAll('—', ' - ').replaceAll('·', ' | ').replaceAll('°', ' deg').replaceAll('×', ' x ')
    );
    // jsPDF may wrap immediately before a separator, so normalize whitespace
    // introduced by layout without loosening the ordered fabrication content.
    const normalizedPdfText = pdfText.replace(/\s+/g, ' ');
    for (const line of pdfFabricationLines) expect(normalizedPdfText).toContain(line.replace(/\s+/g, ' '));
  });

  test('persists round and rounded operations through save and reopen', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'round-cuts-persistence.carvd');

    await openPartCutsFromProperties(window);
    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Round Hole\b/ }).click();
    await window.getByLabel('Depth').selectOption('blind');
    await window.getByLabel('Tilt From Square (degrees)').fill('15');
    await window.getByLabel('Repeating Pattern').selectOption('linear');
    await window.getByLabel('Hole Count').fill('3');
    await window.getByLabel('Direction').fill('37');
    const roundPreview = window.getByRole('img', { name: 'Part cuts geometry preview' });
    const roundGeometryBefore = await roundPreview.getAttribute('data-geometry-signature');
    await window.getByRole('button', { name: 'Move Right' }).click();
    await window.getByRole('button', { name: 'Enlarge Hole' }).click();
    await expect.poll(() => roundPreview.getAttribute('data-geometry-signature')).not.toBe(roundGeometryBefore);
    await window.getByRole('button', { name: 'Save Cut' }).click();

    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Countersink\b/ }).click();
    await window.getByLabel('Repeating Pattern').selectOption('grid');
    await window.getByLabel('Rows').fill('3');
    await window.getByLabel('Columns').fill('2');
    await fillFraction(window, 'Row Spacing', 0.25);
    await fillFraction(window, 'Column Spacing', 0.5);
    await window.getByLabel('Grid Rotation').fill('23');
    await window.getByRole('button', { name: 'Save Cut' }).click();

    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Counterbore\b/ }).click();
    await window.getByLabel('Repeating Pattern').selectOption('circular');
    await window.getByLabel('Hole Count').fill('4');
    await fillFraction(window, 'Pattern Radius', 0.5);
    await window.getByLabel('Start Angle').fill('30');
    await window.getByRole('button', { name: 'Save Cut' }).click();

    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Rounded Rectangle\b/ }).click();
    const rectanglePreview = window.getByRole('img', { name: 'Part cuts geometry preview' });
    const rectangleGeometryBefore = await rectanglePreview.getAttribute('data-geometry-signature');
    await window.getByRole('button', { name: 'Move Right' }).click();
    await window.getByRole('button', { name: 'Extend Length' }).click();
    await window.getByRole('button', { name: 'Widen' }).click();
    await expect.poll(() => rectanglePreview.getAttribute('data-geometry-signature')).not.toBe(rectangleGeometryBefore);
    await window.getByRole('button', { name: 'Save Cut' }).click();

    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Rounded Slot\b/ }).click();
    await window.getByRole('button', { name: 'Move Right' }).click();
    await window.getByRole('button', { name: 'Extend Length' }).click();
    await window.getByRole('button', { name: 'Save Cut' }).click();
    await window.getByRole('button', { name: 'Save Part' }).click();

    await queueSavePath(window, projectPath);
    await pressSaveShortcut(window);
    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await queueOpenPaths(window, [projectPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(5);

    const savedFeatures = await window.evaluate(() =>
      (window.useProjectStore.getState().parts[0].features ?? []).map((feature) => ({
        kind: feature.kind,
        pattern: feature.kind === 'circular_cut' ? feature.pattern : undefined,
        placement: feature.kind === 'end_cut' ? undefined : feature.placement,
        parameters:
          feature.kind === 'circular_cut'
            ? { diameter: feature.parameters.diameter }
            : feature.kind === 'rounded_cut'
              ? { length: feature.parameters.length, width: feature.parameters.width }
              : undefined
      }))
    );
    expect(savedFeatures).toEqual([
      {
        kind: 'circular_cut',
        pattern: { type: 'linear', count: 3, spacing: 1, direction: 37 },
        placement: { primary: 0.25, secondary: 0.25, rotation: 0 },
        parameters: { diameter: 0.5 }
      },
      {
        kind: 'circular_cut',
        pattern: { type: 'grid', rows: 3, columns: 2, rowSpacing: 0.25, columnSpacing: 0.5, rotation: 23 },
        placement: { primary: 0, secondary: 0, rotation: 0 },
        parameters: { diameter: 0.25 }
      },
      {
        kind: 'circular_cut',
        pattern: { type: 'circular', count: 4, radius: 0.5, startAngle: 30 },
        placement: { primary: 0, secondary: 0, rotation: 0 },
        parameters: { diameter: 0.25 }
      },
      {
        kind: 'rounded_cut',
        pattern: undefined,
        placement: { primary: 0.25, secondary: 0.25, rotation: 0 },
        parameters: { length: 3.25, width: 1.25 }
      },
      {
        kind: 'rounded_cut',
        pattern: undefined,
        placement: { primary: 0.25, secondary: 0.25, rotation: 0 },
        parameters: { length: 3.25, width: 1 }
      }
    ]);
  });

  test('creates and undoes both sides of a paired dowel joint atomically', async () => {
    const { window } = running;
    await addPartFromSidebar(window);
    await window.evaluate(() => {
      const [first, second] = window.useProjectStore.getState().parts;
      window.useProjectStore.setState({
        parts: [
          { ...first, name: 'Lower rail', position: { x: 0, y: 0, z: 0 } },
          { ...second, name: 'Upper rail', position: { x: 0, y: first.thickness, z: 0 } }
        ]
      });
      window.useSelectionStore.getState().selectPart(first.id);
    });

    await openPartCutsFromProperties(window);
    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Create Dowel Joint\b/ }).click();
    await window.getByRole('button', { name: 'Next' }).click();
    await window.getByRole('button', { name: 'Next' }).click();
    await window.getByRole('button', { name: 'Next' }).click();
    await window.getByRole('button', { name: 'Create Dowel Joint' }).click();

    await expect
      .poll(async () =>
        window.evaluate(() => window.useProjectStore.getState().parts.map((part) => part.features?.length ?? 0))
      )
      .toEqual([2, 2]);
    await window.evaluate(() => window.useProjectStore.temporal.getState().undo());
    await expect
      .poll(async () =>
        window.evaluate(() => window.useProjectStore.getState().parts.map((part) => part.features?.length ?? 0))
      )
      .toEqual([0, 0]);
  });
});
