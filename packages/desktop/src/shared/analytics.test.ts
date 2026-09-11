import { describe, expect, it } from 'vitest';
import { bucketCount, sanitizeDesktopAnalyticsEvent } from './analytics';

describe('bucketCount', () => {
  it.each([
    [0, '0'],
    [1, '1-5'],
    [5, '1-5'],
    [6, '6-20'],
    [20, '6-20'],
    [21, '21-50'],
    [50, '21-50'],
    [51, '51+']
  ])('maps %i to %s', (value, expected) => expect(bucketCount(value)).toBe(expected));
});

describe('sanitizeDesktopAnalyticsEvent', () => {
  it('accepts catalog properties', () => {
    expect(
      sanitizeDesktopAnalyticsEvent({
        name: 'project_created',
        properties: { source: 'start_screen', units: 'imperial' }
      })
    ).toEqual({
      name: 'project_created',
      properties: { source: 'start_screen', units: 'imperial' }
    });
  });

  it.each([
    ['part_cuts_opened', { source: 'properties', operation_count_bucket: '1-5' }],
    ['part_cuts_saved', { operation_count_bucket: '6-20' }]
  ])('accepts privacy-safe %s properties', (name, properties) => {
    expect(sanitizeDesktopAnalyticsEvent({ name, properties })).toEqual({ name, properties });
  });

  it('strips custom cut details from analytics events', () => {
    expect(
      sanitizeDesktopAnalyticsEvent({
        name: 'part_cuts_opened',
        properties: {
          source: 'context_menu',
          operation_count_bucket: '1-5',
          part_name: 'Secret cabinet side',
          dimensions: [24, 12, 0.75],
          cut_parameters: { depth: 0.25 }
        }
      })
    ).toEqual({
      name: 'part_cuts_opened',
      properties: { source: 'context_menu', operation_count_bucket: '1-5' }
    });
  });

  it.each(['projectName', 'filePath', 'notes', 'email', 'licenseKey', 'partCount'])(
    'removes prohibited property %s',
    (property) => {
      expect(
        sanitizeDesktopAnalyticsEvent({
          name: 'project_created',
          properties: { source: 'start_screen', units: 'imperial', [property]: 'secret' }
        })
      ).toEqual({
        name: 'project_created',
        properties: { source: 'start_screen', units: 'imperial' }
      });
    }
  );

  it('rejects unknown event names', () => {
    expect(sanitizeDesktopAnalyticsEvent({ name: 'renderer_clicked', properties: {} })).toBeNull();
  });

  it.each([
    [
      'analytics consent choice',
      { name: 'analytics_consent_changed', properties: { choice: 'denied', surface: 'onboarding' } }
    ],
    ['project save kind', { name: 'project_saved', properties: { save_kind: 'scheduled', part_count_bucket: '1-5' } }],
    ['export type', { name: 'export_completed', properties: { export_type: 'svg', success: true } }],
    ['checkout license mode', { name: 'checkout_opened', properties: { surface: 'trial', license_mode: 'licensed' } }]
  ])('rejects invalid enum value for %s', (_property, input) => {
    expect(sanitizeDesktopAnalyticsEvent(input)).toBeNull();
  });

  it.each([
    [
      'cut list success',
      {
        name: 'cut_list_generated',
        properties: { part_count_bucket: '1-5', stock_count_bucket: '1-5', success: 'true' }
      }
    ],
    ['export success', { name: 'export_completed', properties: { export_type: 'project_pdf', success: 1 } }]
  ])('rejects invalid boolean value for %s', (_property, input) => {
    expect(sanitizeDesktopAnalyticsEvent(input)).toBeNull();
  });

  it.each([
    ['analytics_consent_changed.choice', { name: 'analytics_consent_changed', properties: { surface: 'onboarding' } }],
    ['analytics_consent_changed.surface', { name: 'analytics_consent_changed', properties: { choice: 'granted' } }],
    ['onboarding_completed.source', { name: 'onboarding_completed', properties: {} }],
    ['project_created.source', { name: 'project_created', properties: { units: 'imperial' } }],
    ['project_created.units', { name: 'project_created', properties: { source: 'start_screen' } }],
    ['project_saved.save_kind', { name: 'project_saved', properties: { part_count_bucket: '6-20' } }],
    ['project_saved.part_count_bucket', { name: 'project_saved', properties: { save_kind: 'manual' } }],
    [
      'cut_list_generated.part_count_bucket',
      { name: 'cut_list_generated', properties: { stock_count_bucket: '6-20', success: true } }
    ],
    [
      'cut_list_generated.stock_count_bucket',
      { name: 'cut_list_generated', properties: { part_count_bucket: '6-20', success: true } }
    ],
    [
      'cut_list_generated.success',
      { name: 'cut_list_generated', properties: { part_count_bucket: '6-20', stock_count_bucket: '6-20' } }
    ],
    ['export_completed.export_type', { name: 'export_completed', properties: { success: true } }],
    ['export_completed.success', { name: 'export_completed', properties: { export_type: 'project_pdf' } }],
    ['checkout_opened.surface', { name: 'checkout_opened', properties: { license_mode: 'trial' } }],
    ['checkout_opened.license_mode', { name: 'checkout_opened', properties: { surface: 'settings' } }],
    ['license_activated.license_mode', { name: 'license_activated', properties: {} }]
  ])('rejects an event missing required property %s', (_property, input) => {
    expect(sanitizeDesktopAnalyticsEvent(input)).toBeNull();
  });
});
