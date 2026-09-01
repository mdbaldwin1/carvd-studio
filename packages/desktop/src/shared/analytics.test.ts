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
});
