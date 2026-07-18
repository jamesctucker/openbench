import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { installDefaults } from "../../.opencode/cron/install";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("install.ts", () => {
  const tmpDir = join(tmpdir(), `cron-test-install-${Date.now()}`);
  const sourceDir = join(tmpDir, "source");
  const targetDir = join(tmpDir, "target");

  beforeAll(() => {
    mkdirSync(sourceDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should copy YAML files to target directory", () => {
    writeFileSync(join(sourceDir, "job-a.yaml"), "name: a\ncron: '* * * * *'\nprompt: test\n");
    writeFileSync(join(sourceDir, "job-b.yml"), "name: b\ncron: '* * * * *'\nprompt: test\n");
    writeFileSync(join(sourceDir, "not-a-job.txt"), "hello");
    writeFileSync(join(sourceDir, ".gitkeep"), "");

    const count = installDefaults(sourceDir, targetDir);
    expect(count).toBe(2);
    expect(existsSync(join(targetDir, "job-a.yaml"))).toBe(true);
    expect(existsSync(join(targetDir, "job-b.yml"))).toBe(true);
    expect(existsSync(join(targetDir, "not-a-job.txt"))).toBe(false);
  });

  it("should skip existing files when not forced", () => {
    const count = installDefaults(sourceDir, targetDir);
    expect(count).toBe(0); // both already exist
  });

  it("should overwrite existing files when forced", () => {
    const count = installDefaults(sourceDir, targetDir, true);
    expect(count).toBe(2);
  });

  it("should return 0 for non-existent source directory", () => {
    const count = installDefaults("/nonexistent/path/12345", join(tmpDir, "nope"));
    expect(count).toBe(0);
  });
});
