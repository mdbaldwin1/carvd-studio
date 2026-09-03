import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("desktop release workflow", () => {
  it("packages both Apple Silicon and Intel macOS artifacts", () => {
    const workflow = readFileSync(
      resolve(import.meta.dirname, "../../../.github/workflows/release.yml"),
      "utf8",
    );

    expect(workflow).toContain(
      "npx electron-builder@26.7.0 --mac --arm64 --x64 --publish never",
    );
  });
});
