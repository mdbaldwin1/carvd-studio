import { describe, expect, it } from 'vitest';
import { getDocsUrl } from './docsLinks';

describe('getDocsUrl', () => {
  it('returns docs base URL when section is not provided', () => {
    expect(getDocsUrl()).toBe('https://carvd-studio.com/docs');
  });

  it('maps settings sections to settings page anchors', () => {
    expect(getDocsUrl('settings')).toBe('https://carvd-studio.com/docs/settings');
    expect(getDocsUrl('app-settings')).toBe('https://carvd-studio.com/docs/settings#app-settings');
    expect(getDocsUrl('backup-sync')).toBe('https://carvd-studio.com/docs/settings#backup-sync');
    expect(getDocsUrl('project-settings')).toBe('https://carvd-studio.com/docs/settings#project-settings');
  });

  it('maps known docs slugs directly', () => {
    expect(getDocsUrl('parts')).toBe('https://carvd-studio.com/docs/parts');
    expect(getDocsUrl('cut-lists')).toBe('https://carvd-studio.com/docs/cut-lists');
    expect(getDocsUrl('templates')).toBe('https://carvd-studio.com/docs/templates');
    expect(getDocsUrl('faq')).toBe('https://carvd-studio.com/docs/faq');
    expect(getDocsUrl('troubleshooting')).toBe('https://carvd-studio.com/docs/troubleshooting');
  });
});
