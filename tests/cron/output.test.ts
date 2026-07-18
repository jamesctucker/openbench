import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { routeOutput } from "../../.opencode/cron/output";
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Job } from "../../.opencode/cron/types";

describe("output.ts", () => {
  const tmpDir = join(tmpdir(), `cron-test-output-${Date.now()}`);

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeJob(overrides: Partial<Job> = {}): Job {
    return {
      name: "test-job",
      cron: "* * * * *",
      prompt: "test",
      ...overrides,
    };
  }

  it("should write content to a new file", () => {
    const path = join(tmpDir, "write-test.md");
    const job = makeJob({ output: path });
    routeOutput("Hello world", job, tmpDir);
    expect(readFileSync(path, "utf-8")).toBe("Hello world\n");
  });

  it("should append content to an existing file", () => {
    const path = join(tmpDir, "append-test.md");
    writeFileSync(path, "existing content\n");
    const job = makeJob({ output: path, append: true });
    routeOutput("new content", job, tmpDir);
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("existing content");
    expect(content).toContain("new content");
    expect(content).toContain("---");
  });

  it("should prepend content to a new file", () => {
    const path = join(tmpDir, "prepend-new.md");
    const job = makeJob({ output: path, prepend: true });
    routeOutput("## Morning Briefing\n\n- item 1", job, tmpDir);
    expect(readFileSync(path, "utf-8")).toContain("## Morning Briefing");
  });

  it("should prepend content to an existing file", () => {
    const path = join(tmpDir, "prepend-existing.md");
    writeFileSync(path, "## Afternoon notes\n\nDid some work.\n");
    const job = makeJob({ output: path, prepend: true });
    routeOutput("## Morning Briefing\n\n- item 1", job, tmpDir);
    const content = readFileSync(path, "utf-8");
    expect(content.indexOf("## Morning Briefing")).toBeLessThan(content.indexOf("## Afternoon notes"));
    expect(content).toContain("---");
  });

  it("should merge frontmatter when prepending", () => {
    const path = join(tmpDir, "prepend-fm.md");
    writeFileSync(path, `---
date: 2026-06-15
type: daily-note
tags:
  - area/daily-notes
---

## Afternoon notes

Did some work.
`);
    const job = makeJob({ output: path, prepend: true });
    const newContent = `---
date: 2026-06-16
tags:
  - morning-briefing
---

## Morning Briefing

- item 1`;
    routeOutput(newContent, job, tmpDir);
    const content = readFileSync(path, "utf-8");

    // Should have merged frontmatter arrays
    expect(content).toContain("area/daily-notes");
    expect(content).toContain("morning-briefing");
    // New content should come before existing
    expect(content.indexOf("## Morning Briefing")).toBeLessThan(content.indexOf("## Afternoon notes"));
    // Prepended frontmatter values should override existing scalars
    expect(content).toContain("date: 2026-06-16");
  });

  it("should substitute YYYY-MM-DD in paths", () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const path = join(tmpDir, `daily-note-YYYY-MM-DD.md`);
    const job = makeJob({ output: join(tmpDir, "daily-note-YYYY-MM-DD.md") });
    const result = routeOutput("test", job, tmpDir);
    expect(result).toContain(dateStr);
    expect(existsSync(join(tmpDir, `daily-note-${dateStr}.md`))).toBe(true);
  });

  it("should create parent directories", () => {
    const path = join(tmpDir, "nested", "deep", "output.md");
    const job = makeJob({ output: path });
    routeOutput("test", job, tmpDir);
    expect(existsSync(path)).toBe(true);
  });

  it("should return null when no output is set", () => {
    const job = makeJob();
    const result = routeOutput("test", job, tmpDir);
    expect(result).toBeNull();
  });
});
