import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { matchesGlob, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

describe("desktop release workflow", () => {
  it("generates a Linux launcher and MIME registration for project files", async () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../desktop/package.json"),
        "utf8",
      ),
    );
    const { LinuxTargetHelper } = createRequire(import.meta.url)(
      "app-builder-lib/out/targets/LinuxTargetHelper",
    );
    const directory = mkdtempSync(resolve(tmpdir(), "carvd-mime-test-"));
    try {
      const helper = new LinuxTargetHelper({
        config: manifest.build,
        platformSpecificBuildOptions: manifest.build.linux,
        fileAssociations: manifest.build.fileAssociations,
        executableName: manifest.build.linux.executableName,
        info: { metadata: manifest },
        appInfo: {
          productName: manifest.build.productName,
          sanitizedProductName: manifest.build.productName,
          description: manifest.description,
        },
        getTempFile: async () => resolve(directory, "project.xml"),
      });
      const desktop = await helper.computeDesktopEntry(manifest.build.linux);
      expect(desktop).toContain('Exec="/opt/Carvd Studio/carvd-studio" %U');
      expect(desktop).toContain("StartupWMClass=carvd-studio");
      expect(desktop).toContain("MimeType=application/x-carvd-studio-project;");
      const mime = await helper.mimeTypeFiles;
      expect(mime).not.toBeNull();
      const xml = readFileSync(mime, "utf8");
      expect(xml).toContain('type="application/x-carvd-studio-project"');
      expect(xml).toContain('pattern="*.carvd"');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("includes the compiled output parent and every runtime entry in the package", () => {
    const desktopRoot = resolve(import.meta.dirname, "../../desktop");
    const manifest = JSON.parse(
      readFileSync(resolve(desktopRoot, "package.json"), "utf8"),
    );
    const { FileMatcher } = createRequire(import.meta.url)(
      "app-builder-lib/out/fileMatcher",
    );
    const matcher = new FileMatcher(
      desktopRoot,
      resolve(desktopRoot, ".packaging-test"),
      (value: string) => value,
      ["!build{,/**/*}", "!dist{,/**/*}", ...manifest.build.files],
    );
    const filter = matcher.createFilter();
    const directory = statSync(desktopRoot);
    const file = statSync(resolve(desktopRoot, "package.json"));
    for (const path of [
      "out",
      "out/main",
      "out/preload",
      "out/renderer",
      "out/renderer/branding",
    ]) {
      expect(filter(resolve(desktopRoot, path), directory), path).toBe(true);
    }
    for (const path of [
      manifest.main,
      "out/preload/index.js",
      "out/renderer/index.html",
      "out/renderer/branding/CarvdStudio-Horizontal.svg",
    ]) {
      expect(filter(resolve(desktopRoot, path), file), path).toBe(true);
    }
    expect(filter(resolve(desktopRoot, "src/main/index.ts"), file)).toBe(false);
  });

  it("packages both Apple Silicon and Intel macOS artifacts", () => {
    const workflow = readFileSync(
      resolve(import.meta.dirname, "../../../.github/workflows/release.yml"),
      "utf8",
    );

    expect(workflow).toContain(
      "npx --no-install electron-builder --mac --arm64 --x64 --publish never",
    );
  });

  it.each(["release.yml", "test.yml"])(
    "%s packages with the installed lockfile toolchain",
    (filename) => {
      const workflow = readFileSync(
        resolve(import.meta.dirname, `../../../.github/workflows/${filename}`),
        "utf8",
      );
      const packagingCommands = workflow.match(
        /npx[^\n]*electron-builder[^\n]*/g,
      );
      expect(workflow).not.toContain("prepare:runtime-deps");
      expect(workflow).not.toContain("delete pkg.workspaces");
      expect(workflow).toContain("npm ci");
      expect(packagingCommands?.length).toBeGreaterThan(0);
      for (const command of packagingCommands ?? []) {
        expect(command).toMatch(/^npx --no-install electron-builder --/);
        expect(command).not.toMatch(/electron-builder@/);
        expect(command).toContain("--publish never");
      }
    },
  );
});

describe("release publication gates", () => {
  const require = createRequire(import.meta.url);
  const { load } = require("js-yaml");
  const readWorkflow = (name: string) =>
    load(
      readFileSync(
        resolve(import.meta.dirname, `../../../.github/workflows/${name}.yml`),
        "utf8",
      ),
    );
  const release = readWorkflow("release");
  const tests = readWorkflow("test");
  const credentials = release.jobs["release-credentials"].steps[0];

  it("requires the full reusable test workflow and credential checks before any tag or release", () => {
    expect(tests.on).toHaveProperty("workflow_call");
    expect(release.jobs.validate.uses).toBe("./.github/workflows/test.yml");
    expect(release.jobs.validate.secrets).toBe("inherit");
    expect(release.jobs.prepare.needs).toEqual([
      "validate",
      "release-credentials",
    ]);
    expect(release.jobs.build.needs).toBe("prepare");
    expect(release.jobs["create-release"].needs).toEqual(["prepare", "build"]);
    for (const job of [
      "unit-tests",
      "e2e-tests",
      "linux-package",
      "lint",
      "website-tests",
      "website-e2e",
    ]) {
      expect(tests.jobs).toHaveProperty(job);
      expect(tests.jobs[job]["continue-on-error"]).not.toBe(true);
    }
    expect(tests.jobs["e2e-tests"].strategy.matrix.os).toEqual([
      "ubuntu-latest",
      "macos-latest",
      "windows-latest",
    ]);
    expect(release.on.push.branches).toEqual(["main"]);
    expect(release.on).toHaveProperty("workflow_dispatch");
  });

  it("retains NSIS installers and their differential blockmaps through publication", () => {
    const upload = release.jobs.build.steps.find(
      (step: { name: string }) => step.name === "Upload artifacts (Windows)",
    );
    const publication = release.jobs["create-release"].steps.find(
      (step: { name: string }) => step.name === "Create Release",
    );
    for (const filename of [
      "Carvd.Studio.Setup.1.3.0.exe",
      "Carvd.Studio.Setup.1.3.0.exe.blockmap",
      "latest.yml",
    ]) {
      for (const [patterns, prefix] of [
        [upload.with.path, "packages/desktop/dist"],
        [publication.with.files, "dist/win"],
      ]) {
        expect(
          patterns
            .trim()
            .split(/\s+/)
            .some((pattern: string) =>
              matchesGlob(`${prefix}/${filename}`, pattern),
            ),
          `${prefix}/${filename} must survive the release artifact pipeline`,
        ).toBe(true);
      }
    }
  });

  it("uses locked Lightning CSS binaries on every CI platform without reinstalling", () => {
    const lock = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../package-lock.json"),
        "utf8",
      ),
    );
    const cssPackages = Object.entries(lock.packages).filter(([name]) =>
      name.endsWith("node_modules/lightningcss"),
    );
    expect(cssPackages.length).toBeGreaterThan(0);
    for (const [name, entry] of cssPackages) {
      const css = entry as {
        version: string;
        optionalDependencies: Record<string, string>;
      };
      for (const [suffix, os, cpu] of [
        ["darwin-arm64", "darwin", "arm64"],
        ["darwin-x64", "darwin", "x64"],
        ["linux-x64-gnu", "linux", "x64"],
        ["win32-x64-msvc", "win32", "x64"],
      ]) {
        const binaryName = `lightningcss-${suffix}`;
        const binary = lock.packages[name.replace(/lightningcss$/, binaryName)];
        expect(css.optionalDependencies[binaryName]).toBe(css.version);
        expect(binary, `${name}: ${binaryName}`).toMatchObject({
          version: css.version,
          optional: true,
          os: [os],
          cpu: [cpu],
        });
        expect(binary.integrity).toMatch(/^sha512-/);
      }
    }
    const commands = tests.jobs["e2e-tests"].steps
      .map((step: { run?: string }) => step.run ?? "")
      .join("\n");
    expect(commands).toMatch(/(?:^|\n)npm ci(?:\n|$)/);
    expect(commands).not.toMatch(/npm\s+(?:install|i|add)\b/);
  });

  const required = [
    "CSC_LINK",
    "CSC_KEY_PASSWORD",
    "APPLE_ID",
    "APPLE_ID_PASSWORD",
    "APPLE_TEAM_ID",
    "LICENSE_PRIVATE_KEY",
  ];
  it.each(required)(
    "rejects missing %s without printing supplied credential values",
    (missing) => {
      const env = Object.fromEntries(
        required.map((name) => [name, "test-sensitive-value"]),
      );
      env[missing] = "";
      const result = spawnSync("bash", ["-c", credentials.run], {
        env,
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain(
        `Missing required release credential: ${missing}`,
      );
      expect(result.stdout + result.stderr).not.toContain(
        "test-sensitive-value",
      );
      for (const name of required)
        expect(credentials.env[name]).toBe(`\${{ secrets.${name} }}`);
    },
  );

  it("accepts a complete credential configuration without logging values", () => {
    const env = Object.fromEntries(
      required.map((name) => [name, "test-sensitive-value"]),
    );
    const result = spawnSync("bash", ["-c", credentials.run], {
      env,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toBe("");
  });

  it("requires macOS signing and strict notarization", () => {
    const step = release.jobs.build.steps.find(
      (step: { name: string }) => step.name === "Package app (macOS)",
    );
    expect(step.env.CARVD_REQUIRE_NOTARIZATION).toBe("true");
    expect(step.run).toContain("--config.forceCodeSigning=true");
  });

  it("rejects an existing tag pointing away from the validated commit", () => {
    const step = release.jobs.prepare.steps.find(
      (step: { name: string }) => step.name === "Create git tag",
    );
    const result = spawnSync(
      "bash",
      [
        "-c",
        `
      git() {
        if [ "$1" = rev-parse ]; then
          case "$2" in
            HEAD) echo validated-sha ;;
            *commit*) echo old-sha ;;
            *) echo old-sha ;;
          esac
        elif [ "$1" = push ]; then
          echo UNEXPECTED_PUSH
        fi
      }
      ${step.run.replaceAll("\${{ needs.prepare.outputs.tag }}", "v-test").replaceAll("\${{ steps.version.outputs.tag }}", "v-test")}
    `,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "does not match the validated release commit",
    );
    expect(result.stdout).not.toContain("UNEXPECTED_PUSH");
  });

  const notarizeSource = readFileSync(
    resolve(import.meta.dirname, "../../desktop/scripts/notarize.cjs"),
    "utf8",
  );
  const loadHook = (
    env: Record<string, string>,
    notarize = vi.fn().mockResolvedValue(undefined),
  ) => {
    const exports: { default?: (context: object) => Promise<void> } = {};
    runInNewContext(notarizeSource, {
      exports,
      process: { env },
      console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      require: (name: string) =>
        name === "@electron/notarize" ? { notarize } : require(name),
    });
    return { hook: exports.default!, notarize };
  };
  const context = {
    electronPlatformName: "darwin",
    appOutDir: "/tmp/test",
    packager: { appInfo: { productFilename: "Carvd Studio" } },
  };
  it.each(["APPLE_ID", "APPLE_ID_PASSWORD", "APPLE_TEAM_ID"])(
    "fails release notarization when %s is missing",
    async (missing) => {
      const env: Record<string, string> = {
        CARVD_REQUIRE_NOTARIZATION: "true",
        APPLE_ID: "test",
        APPLE_ID_PASSWORD: "test",
        APPLE_TEAM_ID: "test",
      };
      delete env[missing];
      const { hook, notarize } = loadHook(env);
      await expect(hook(context)).rejects.toThrow(
        "Release notarization requires",
      );
      expect(notarize).not.toHaveBeenCalled();
    },
  );
  it("preserves explicit local unsigned builds and non-macOS packaging", async () => {
    const { hook, notarize } = loadHook({});
    await expect(hook(context)).resolves.toBeUndefined();
    await expect(
      hook({ electronPlatformName: "linux" }),
    ).resolves.toBeUndefined();
    expect(notarize).not.toHaveBeenCalled();
  });
  it("submits complete release credentials and propagates notarization failures", async () => {
    const notarize = vi.fn().mockRejectedValue(new Error("submission failed"));
    const { hook } = loadHook(
      {
        CARVD_REQUIRE_NOTARIZATION: "true",
        APPLE_ID: "test",
        APPLE_ID_PASSWORD: "test",
        APPLE_TEAM_ID: "test",
      },
      notarize,
    );
    await expect(hook(context)).rejects.toThrow("submission failed");
    expect(notarize).toHaveBeenCalledWith(
      expect.objectContaining({
        appPath: "/tmp/test/Carvd Studio.app",
        tool: "notarytool",
      }),
    );
  });
});
