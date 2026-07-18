import { readdirSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

export function installDefaults(sourceDir: string, targetDir: string, force = false): number {
  let count = 0;
  mkdirSync(targetDir, { recursive: true });

  let entries: string[];
  try {
    entries = readdirSync(sourceDir);
  } catch {
    return count;
  }

  for (const entry of entries.sort()) {
    const ext = extname(entry).toLowerCase();
    if (ext !== ".yaml" && ext !== ".yml") continue;

    const dst = join(targetDir, entry);
    if (existsSync(dst) && !force) {
      console.log(`  Skipping ${entry} (already exists)`);
      continue;
    }

    copyFileSync(join(sourceDir, entry), dst);
    console.log(`  Installed ${entry}`);
    count++;
  }

  console.log(`Installed ${count} job(s) to ${targetDir}`);
  return count;
}
