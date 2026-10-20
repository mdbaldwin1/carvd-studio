import { posix, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

/** OS launchers pass local paths on Windows and paths or file: URLs on Linux. */
export function projectFilesFromArguments(
  args: readonly string[],
  cwd = process.cwd(),
  platform: NodeJS.Platform = process.platform
): string[] {
  const paths = platform === 'win32' ? win32 : posix;
  const result = new Set<string>();
  const pathOptions = new Set(['--user-data-dir', '--disk-cache-dir', '--log-file', '--crash-dumps-dir']);
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument.startsWith('-')) {
      if (pathOptions.has(argument)) index++;
      continue;
    }
    try {
      const filePath = /^file:/i.test(argument)
        ? fileURLToPath(argument, { windows: platform === 'win32' })
        : /^[a-z][a-z\d+.-]*:\/\//i.test(argument)
          ? null
          : argument;
      if (filePath && paths.extname(filePath).toLowerCase() === '.carvd') {
        result.add(paths.resolve(cwd, filePath));
      }
    } catch {
      // Invalid/non-local file URLs are not project-open requests.
    }
  }
  return [...result];
}
