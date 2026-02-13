import { describe, it, expect } from 'vitest';
import { parseChangelog } from './changelogParser';

describe('parseChangelog', () => {
  it('returns empty array for empty input', () => {
    expect(parseChangelog('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    const input = `# Changelog

All notable changes to Carvd Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).`;

    expect(parseChangelog(input)).toEqual([]);
  });

  it('parses a single version with one category', () => {
    const input = `## [1.0.0] - 2025-06-15

### Added

- **Feature A** - Description of feature A
- **Feature B** - Description of feature B`;

    const result = parseChangelog(input);
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('1.0.0');
    expect(result[0].date).toBe('2025-06-15');
    expect(result[0].categories).toHaveLength(1);
    expect(result[0].categories[0].name).toBe('Added');
    expect(result[0].categories[0].entries).toHaveLength(2);
    expect(result[0].categories[0].entries[0]).toEqual({
      text: 'Feature A',
      description: 'Description of feature A'
    });
  });

  it('parses multiple categories within a version', () => {
    const input = `## [1.1.0] - 2025-07-01

### Added

- **New thing** - A new feature

### Changed

- **Updated thing** - An update

### Fixed

- **Bug fix** - Fixed a bug`;

    const result = parseChangelog(input);
    expect(result).toHaveLength(1);
    expect(result[0].categories).toHaveLength(3);
    expect(result[0].categories[0].name).toBe('Added');
    expect(result[0].categories[1].name).toBe('Changed');
    expect(result[0].categories[2].name).toBe('Fixed');
    expect(result[0].categories[2].entries[0].text).toBe('Bug fix');
  });

  it('parses multiple versions', () => {
    const input = `## [2.0.0] - 2025-08-01

### Added

- **Big feature** - Major new capability

## [1.0.0] - 2025-06-15

### Added

- **Initial release** - First version`;

    const result = parseChangelog(input);
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe('2.0.0');
    expect(result[1].version).toBe('1.0.0');
  });

  it('parses plain entries without bold labels', () => {
    const input = `## [1.0.0] - 2025-06-15

### Fixed

- Fixed a minor display issue
- Corrected tooltip positioning`;

    const result = parseChangelog(input);
    expect(result[0].categories[0].entries).toHaveLength(2);
    expect(result[0].categories[0].entries[0]).toEqual({
      text: 'Fixed a minor display issue',
      description: ''
    });
    expect(result[0].categories[0].entries[1]).toEqual({
      text: 'Corrected tooltip positioning',
      description: ''
    });
  });

  it('handles entries with em dash separator', () => {
    const input = `## [1.0.0] - 2025-06-15

### Added

- **Feature** — Description with em dash`;

    const result = parseChangelog(input);
    expect(result[0].categories[0].entries[0]).toEqual({
      text: 'Feature',
      description: 'Description with em dash'
    });
  });

  it('handles entries with en dash separator', () => {
    const input = `## [1.0.0] - 2025-06-15

### Added

- **Feature** – Description with en dash`;

    const result = parseChangelog(input);
    expect(result[0].categories[0].entries[0]).toEqual({
      text: 'Feature',
      description: 'Description with en dash'
    });
  });

  it('ignores link references at the bottom', () => {
    const input = `## [1.0.0] - 2025-06-15

### Added

- **Feature** - Description

[1.0.0]: https://github.com/example/repo/releases/tag/v1.0.0`;

    const result = parseChangelog(input);
    expect(result).toHaveLength(1);
    expect(result[0].categories[0].entries).toHaveLength(1);
  });

  it('handles pre-release version tags', () => {
    const input = `## [1.0.0-beta.1] - 2025-06-15

### Added

- **Beta feature** - Testing`;

    const result = parseChangelog(input);
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('1.0.0-beta.1');
  });

  it('parses the actual CHANGELOG.md format', () => {
    const input = `# Changelog

All notable changes to Carvd Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-02-12

### Added

- **3D Furniture Design Editor** - Interactive workspace with real-time 3D visualization using Three.js
- **Part Management** - Create, edit, duplicate, and organize rectangular parts with precise dimensions
- **Stock/Material System** - Define lumber and sheet goods with pricing, grain direction, and board foot calculations

[0.1.0]: https://github.com/mdbaldwin1/carvd-studio/releases/tag/v0.1.0`;

    const result = parseChangelog(input);
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('0.1.0');
    expect(result[0].date).toBe('2025-02-12');
    expect(result[0].categories[0].name).toBe('Added');
    expect(result[0].categories[0].entries).toHaveLength(3);
    expect(result[0].categories[0].entries[0].text).toBe('3D Furniture Design Editor');
    expect(result[0].categories[0].entries[0].description).toBe(
      'Interactive workspace with real-time 3D visualization using Three.js'
    );
  });
});
