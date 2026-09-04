import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
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

type PersistedFeature = {
  kind: 'end_cut' | 'rect_cut' | 'circular_cut' | 'rounded_cut';
  cutType: string;
  target: Record<string, string>;
  parameters: Record<string, unknown>;
  label: string;
  enabled: boolean;
  placement?: Record<string, number>;
  pattern?: Record<string, number | string>;
};

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
        depth: 0.25,
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

async function fillFraction(window: Page, label: string, value: number, index = 0): Promise<void> {
  const input = window
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .nth(index)
    .locator('xpath=following-sibling::input');
  await input.fill(String(value));
  await expect(input).toHaveValue(String(value));
  await input.press('Enter');
}

async function selectFeatureTarget(window: Page, feature: PersistedFeature): Promise<void> {
  const target = feature.target.face ?? feature.target.edge ?? feature.target.corner;
  const label =
    feature.kind === 'end_cut' && target === 'front_face'
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
  await window.getByRole('button', { name: label, exact: true }).click();
}

async function applyFeatureControls(window: Page, feature: PersistedFeature): Promise<void> {
  await selectFeatureTarget(window, feature);
  await window.locator('#feature-label').fill(feature.label);

  if (feature.kind === 'end_cut') {
    if (feature.target.face === 'left_end' || feature.target.face === 'right_end')
      await window.locator('#end-cut-type').selectOption(feature.cutType);
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      await window.locator('#horizontal-angle').fill(String(feature.parameters.horizontalAngle));
      await window.locator('#horizontal-flip').selectOption(feature.parameters.horizontalFlip ? 'back' : 'front');
    }
    if (feature.cutType === 'bevel' || feature.cutType === 'compound') {
      await window.locator('#vertical-angle').fill(String(feature.parameters.verticalAngle));
      const face = feature.target.face!;
      const highPointOnTop =
        face === 'right_end' ? !feature.parameters.verticalFlip : !!feature.parameters.verticalFlip;
      await window.locator('#vertical-flip').selectOption(highPointOnTop ? 'top' : 'bottom');
    }
    return;
  }

  if (feature.kind === 'circular_cut') {
    await fillFraction(window, 'Hole Diameter', feature.parameters.diameter as number);
    await window.locator('#round-depth-mode').selectOption(feature.parameters.depthMode as string);
    if (feature.parameters.depthMode === 'blind')
      await fillFraction(window, 'Hole Depth', feature.parameters.depth as number);
    await window.locator('#hole-tilt').fill(String(feature.parameters.tilt));
    await window.locator('#hole-direction').fill(String(feature.parameters.direction));
    if (feature.cutType === 'countersink') {
      const countersink = feature.parameters.countersink as { majorDiameter: number; includedAngle: number };
      await fillFraction(window, 'Countersink Major Diameter', countersink.majorDiameter);
      await window.locator('#countersink-angle').fill(String(countersink.includedAngle));
    }
    if (feature.cutType === 'counterbore') {
      const counterbore = feature.parameters.counterbore as { diameter: number; depth: number };
      await fillFraction(window, 'Counterbore Diameter', counterbore.diameter);
      await fillFraction(window, 'Counterbore Depth', counterbore.depth);
    }
    await fillFraction(window, 'Offset Along Face', feature.placement!.primary);
    await fillFraction(window, 'Offset Across Face', feature.placement!.secondary);
    await window.locator('#hole-pattern').selectOption((feature.pattern?.type as string) ?? 'none');
    if (feature.pattern?.type === 'linear') {
      await window.locator('#linear-count').fill(String(feature.pattern.count));
      await fillFraction(window, 'Spacing', feature.pattern.spacing as number);
      await window.locator('#linear-direction').fill(String(feature.pattern.direction));
    } else if (feature.pattern?.type === 'grid') {
      await window.locator('#grid-rows').fill(String(feature.pattern.rows));
      await window.locator('#grid-columns').fill(String(feature.pattern.columns));
      await fillFraction(window, 'Row Spacing', feature.pattern.rowSpacing as number);
      await fillFraction(window, 'Column Spacing', feature.pattern.columnSpacing as number);
    } else if (feature.pattern?.type === 'circular') {
      await window.locator('#circular-count').fill(String(feature.pattern.count));
      await fillFraction(window, 'Pattern Radius', feature.pattern.radius as number);
      await window.locator('#circular-start-angle').fill(String(feature.pattern.startAngle));
    }
    return;
  }

  if (feature.kind === 'rounded_cut') {
    await fillFraction(window, 'Opening Length', feature.parameters.length as number);
    await fillFraction(window, 'Opening Width', feature.parameters.width as number);
    if (feature.cutType === 'rounded_rectangle')
      await fillFraction(window, 'Corner Radius', feature.parameters.cornerRadius as number);
    await window.locator('#rounded-depth-mode').selectOption(feature.parameters.depthMode as string);
    if (feature.parameters.depthMode === 'blind')
      await fillFraction(window, 'Opening Depth', feature.parameters.depth as number);
    await window.locator('#rounded-rotation').fill(String(feature.placement!.rotation));
    await fillFraction(window, 'Offset Along Face', feature.placement!.primary);
    await fillFraction(window, 'Offset Across Face', feature.placement!.secondary);
    return;
  }

  const size = feature.parameters.size as { length: number; width: number };
  const depthMode = feature.parameters.depthMode as string;
  if (await window.locator('#depth-mode').count()) await window.locator('#depth-mode').selectOption(depthMode);
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

async function savePartAndReopen(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Save Part' }).click();
  await expect.poll(() => isEditingPartCuts(window)).toBe(false);
  await openPartCutsFromProperties(window);
}

async function qualifyOperationLifecycle(window: Page, scenario: OperationScenario): Promise<void> {
  await window.getByRole('button', { name: '+ Add Cut' }).click();
  await window.getByRole('button', { name: new RegExp(`^${scenario.preset}\\b`) }).click();
  if (scenario.blindOnly) await expect(window.locator('#depth-mode')).toHaveCount(0);
  await applyFeatureControls(window, scenario.initial);
  await expect(window.locator('#feature-label')).toHaveValue(scenario.initial.label);
  await window.getByRole('button', { name: 'Save Cut' }).click();

  // Enabled is an authored state too: toggle it through the list and leave it enabled before persistence.
  const enabledToggle = window.locator('input[type="checkbox"]').first();
  await enabledToggle.uncheck();
  await enabledToggle.check();
  await savePartAndReopen(window);
  await expect.poll(() => persistedFirstFeature(window)).toEqual(scenario.initial);

  await window.getByRole('button', { name: new RegExp(`^1\\. ${scenario.initial.label}`) }).click();
  await applyFeatureControls(window, scenario.edited);
  await expect(window.locator('#feature-label')).toHaveValue(scenario.edited.label);
  await window.getByRole('button', { name: 'Save Cut' }).click();
  await savePartAndReopen(window);
  await expect.poll(() => persistedFirstFeature(window)).toEqual(scenario.edited);
  await expect.poll(() => getFirstPartFeatureCount(window)).toBe(1);

  await window.getByRole('button', { name: 'Actions for cut 1' }).click();
  await window.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(window.getByText(scenario.edited.label)).toHaveCount(0);
  await window.getByRole('button', { name: 'Undo cut change' }).click();
  await expect(window.getByText(scenario.edited.label)).toBeVisible();
  await window.getByRole('button', { name: 'Redo cut change' }).click();
  await expect(window.getByText(scenario.edited.label)).toHaveCount(0);
  await window.getByRole('button', { name: 'Save Part' }).click();
  await expect.poll(() => getFirstPartFeatureCount(window)).toBe(0);
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
        // an Electron save/reopen cycle; the default single-test timeout is
        // shorter than the qualification work itself.
        test.setTimeout(180000);
        const { window } = running;
        await openPartCutsFromProperties(window);
        const scenarios = CUSTOM_CUT_LIFECYCLE_SCENARIOS.filter(includes);
        for (const [index, scenario] of scenarios.entries()) {
          await test.step(scenario.title, () => qualifyOperationLifecycle(window, scenario));
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
    await window.getByRole('button', { name: 'Save Cut' }).click();

    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Rounded Rectangle\b/ }).click();
    await window.getByRole('button', { name: 'Save Cut' }).click();
    await window.getByRole('button', { name: 'Save Part' }).click();

    await queueSavePath(window, projectPath);
    await pressSaveShortcut(window);
    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await queueOpenPaths(window, [projectPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(2);

    const savedKinds = await window.evaluate(() =>
      (window.useProjectStore.getState().parts[0].features ?? []).map((feature) => ({
        kind: feature.kind,
        pattern: feature.kind === 'circular_cut' ? feature.pattern?.type : undefined
      }))
    );
    expect(savedKinds).toEqual([
      { kind: 'circular_cut', pattern: 'linear' },
      { kind: 'rounded_cut', pattern: undefined }
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
