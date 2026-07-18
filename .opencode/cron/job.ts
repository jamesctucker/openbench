import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { isValid } from "./scheduler";
import type { Job } from "./types";

export const JobSchema = z.object({
  name: z.string(),
  cron: z.string(),
  prompt: z.string(),
  skills: z.array(z.string()).optional(),
  model: z.string().optional(),
  agent: z.string().optional(),
  output: z.string().optional(),
  append: z.boolean().optional(),
  prepend: z.boolean().optional(),
  timeout: z.number().optional(),
  hostname: z.string().optional(),
});

export function buildPrompt(job: Job): string {
  if (!job.skills?.length) return job.prompt;
  const skills = job.skills.map(s => `"${s}"`).join(", ");
  return `Load the following skills using the skill tool: ${skills}.\n\n${job.prompt}`;
}

export function loadJobs(directory: string): Job[] {
  const jobs: Job[] = [];
  let entries: string[];

  try {
    entries = readdirSync(directory);
  } catch {
    return jobs;
  }

  for (const entry of entries.sort()) {
    const ext = extname(entry).toLowerCase();
    if (ext !== ".yaml" && ext !== ".yml") continue;

    const filePath = join(directory, entry);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = parse(raw);
      if (typeof parsed !== "object" || parsed === null) {
        console.warn(`Warning: skipping ${entry}: not a valid YAML object`);
        continue;
      }

      const result = JobSchema.safeParse(parsed);
      if (!result.success) {
        console.warn(`Warning: skipping ${entry}: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")}`);
        continue;
      }

      const job = result.data as Job;

      if (job.append && job.prepend) {
        console.warn(`Warning: skipping ${entry}: cannot set both 'append' and 'prepend'`);
        continue;
      }

      if ((job.append || job.prepend) && !job.output) {
        console.warn(`Warning: skipping ${entry}: 'output' is required when 'append' or 'prepend' is true`);
        continue;
      }

      if (!isValid(job.cron)) {
        console.warn(`Warning: skipping ${entry}: invalid cron expression '${job.cron}'`);
        continue;
      }

      jobs.push(job);
    } catch (e) {
      console.warn(`Warning: skipping ${entry}: ${(e as Error).message}`);
    }
  }

  return jobs;
}
