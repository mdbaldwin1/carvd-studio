import { describe, expect, it } from 'vitest';
import { projectFilesFromArguments } from './projectFileArguments';

describe('project launch arguments', () => {
  it('opens local paths with spaces, resolves relative paths, and deduplicates file URLs', () => {
    expect(
      projectFilesFromArguments(
        ['/projects/bench one.carvd', 'file:///projects/bench%20one.carvd', 'bench two.CARVD'],
        '/projects',
        'linux'
      )
    ).toEqual(['/projects/bench one.carvd', '/projects/bench two.CARVD']);
  });

  it('decodes Windows drive and UNC file URLs without applying POSIX path rules', () => {
    expect(
      projectFilesFromArguments(
        ['C:\\Projects\\bench one.carvd', 'file:///C:/Projects/bench%20two.carvd', 'file://server/share/bench.carvd'],
        'C:\\Projects',
        'win32'
      )
    ).toEqual(['C:\\Projects\\bench one.carvd', 'C:\\Projects\\bench two.carvd', '\\\\server\\share\\bench.carvd']);
  });

  it('ignores switches, option values, unrelated files, remote URLs and malformed file URLs', () => {
    expect(
      projectFilesFromArguments(
        [
          '--test-mode',
          '--user-data-dir=/tmp/profile.carvd',
          '--log-file',
          '/tmp/log.carvd',
          '/tmp/notes.txt',
          'https://example.com/project.carvd',
          'file:///tmp/%ZZ.carvd',
          'file://remote/share/project.carvd',
          '/tmp/good.carvd'
        ],
        '/projects',
        'linux'
      )
    ).toEqual(['/tmp/good.carvd']);
  });
});
