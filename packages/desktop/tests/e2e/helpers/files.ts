import fs from 'node:fs';
import { expect } from '@playwright/test';

/** File existence alone does not mean an asynchronous JSON write is complete. */
export async function waitForJsonFile(filePath: string, timeout = 30000): Promise<void> {
  await expect(() => {
    JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }).toPass({ timeout });
}
