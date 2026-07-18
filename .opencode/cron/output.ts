import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { resolvePath } from "./util";
import type { Job } from "./types";

interface Frontmatter {
  [key: string]: unknown;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter | null; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content.trimEnd() };

  try {
    const frontmatter = parseYaml(match[1]);
    if (typeof frontmatter === "object" && frontmatter !== null) {
      return { frontmatter: frontmatter as Frontmatter, body: match[2].trimEnd() };
    }
  } catch {
    // invalid YAML — treat as no frontmatter
  }
  return { frontmatter: null, body: content.trimEnd() };
}

function mergeFrontmatter(base: Frontmatter, overlay: Frontmatter): Frontmatter {
  const merged: Frontmatter = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (Array.isArray(value) && Array.isArray(merged[key])) {
      const existing = merged[key] as unknown[];
      const incoming = value as unknown[];
      merged[key] = [...existing];
      for (const item of incoming) {
        if (!existing.some(e => JSON.stringify(e) === JSON.stringify(item))) {
          (merged[key] as unknown[]).push(item);
        }
      }
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function buildWithFrontmatter(fm: Frontmatter, body: string): string {
  return `---\n${stringifyYaml(fm).trim()}\n---\n\n${body.trimEnd()}\n`;
}

function substituteDate(path: string): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return path.replace(/YYYY-MM-DD/g, dateStr);
}

function resolveOutputPath(outputPath: string, workspaceRoot: string): string {
  return resolvePath(substituteDate(outputPath), workspaceRoot);
}

function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function routeOutput(
  content: string,
  job: Job,
  workspaceRoot: string,
): string | null {
  if (!job.output) return null;

  const outputPath = resolveOutputPath(job.output, workspaceRoot);
  ensureParentDir(outputPath);

  const trimmedContent = content.trimEnd();

  if (job.prepend) {
    if (!existsSync(outputPath)) {
      writeFileSync(outputPath, trimmedContent + "\n", "utf-8");
    } else {
      const existingContent = readFileSync(outputPath, "utf-8").trimEnd();
      const newParsed = parseFrontmatter(trimmedContent);
      const existingParsed = parseFrontmatter(existingContent);

      let merged: string;

      if (newParsed.frontmatter || existingParsed.frontmatter) {
        // Existing frontmatter is the base; the new (prepended) content's frontmatter wins.
        const mergedFm = mergeFrontmatter(
          existingParsed.frontmatter ?? {},
          newParsed.frontmatter ?? {},
        );
        const mergedBody = buildWithFrontmatter(
          mergedFm,
          newParsed.body + "\n\n---\n\n" + existingParsed.body,
        );
        merged = mergedBody;
      } else {
        merged = trimmedContent + "\n\n---\n\n" + existingContent + "\n";
      }

      writeFileSync(outputPath, merged, "utf-8");
    }
  } else if (job.append) {
    if (!existsSync(outputPath)) {
      writeFileSync(outputPath, trimmedContent + "\n", "utf-8");
    } else {
      const existingContent = readFileSync(outputPath, "utf-8").trimEnd();
      writeFileSync(outputPath, existingContent + "\n\n---\n\n" + trimmedContent + "\n", "utf-8");
    }
  } else {
    writeFileSync(outputPath, trimmedContent + "\n", "utf-8");
  }

  return outputPath;
}
