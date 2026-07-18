#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { hostname } from "node:os";
import { loadConfig } from "./config";
import { loadJobs, buildPrompt } from "./job";
import { matches } from "./scheduler";
import { acquireLock, releaseLock } from "./lock";
import { routeOutput } from "./output";
import { createLogger } from "./logger";
import { installDefaults } from "./install";
import { resolvePath } from "./util";
import type { CronConfig, Job, RunResult } from "./types";

const WORKSPACE_ROOT = resolve(import.meta.dir, "../..");

function parseArgs(args: string[]) {
  const list = args.includes("--list");
  const dryRun = args.includes("--dry-run");
  const installDefaults = args.includes("--install-defaults");

  const onceIndex = args.indexOf("--once");
  const once = onceIndex !== -1 && args[onceIndex + 1] && !args[onceIndex + 1].startsWith("-")
    ? args[onceIndex + 1]
    : null;

  const jobDirIndex = args.indexOf("--job-dir");
  const jobDir = jobDirIndex !== -1 && args[jobDirIndex + 1] && !args[jobDirIndex + 1].startsWith("-")
    ? args[jobDirIndex + 1]
    : null;

  return { list, dryRun, installDefaults, once, jobDir };
}

async function runJob(job: Job, config: CronConfig, dryRun: boolean): Promise<number> {
  if (dryRun) {
    const model = job.model ?? config.default.model ?? "(opencode default)";
    const timeout = job.timeout ?? config.default.timeout;
    console.log(`  [${job.name}] DRY RUN`);
    console.log(`    model: ${model}`);
    console.log(`    timeout: ${timeout}s`);
    if (job.agent) console.log(`    agent: ${job.agent}`);
    if (job.skills?.length) console.log(`    skills: ${job.skills.join(", ")}`);
    if (job.output) console.log(`    output: ${job.output}`);
    if (job.prepend) console.log(`    mode: prepend`);
    else if (job.append) console.log(`    mode: append`);
    else if (job.output) console.log(`    mode: write`);
    return 0;
  }

  const locksDir = resolvePath(config.locks_dir, WORKSPACE_ROOT);

  if (!acquireLock(job.name, locksDir)) {
    return -1;
  }

  const logger = createLogger(job.name, resolvePath(config.log_dir, WORKSPACE_ROOT));
  const model = job.model ?? config.default.model ?? "";
  const timeout = job.timeout ?? config.default.timeout;

  try {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) env[k] = v;
    }
    env["OPENCODE_DISABLE_AUTOUPDATE"] = "true";

    const cmdArgs = ["run", "--title", job.name];
    if (model) cmdArgs.push("--model", model);
    if (job.agent) cmdArgs.push("--agent", job.agent);
    cmdArgs.push(buildPrompt(job));

    const startTime = performance.now();

    let result: RunResult;
    try {
      const stdout = execFileSync("opencode", cmdArgs, {
        env,
        timeout: timeout * 1000,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
      const duration = Math.round((performance.now() - startTime) / 1000);
      result = { exitCode: 0, stdout, stderr: "", duration };
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; status?: number };
      const duration = Math.round((performance.now() - startTime) / 1000);
      result = {
        exitCode: err.status ?? 1,
        stdout: err.stdout?.toString() ?? "",
        stderr: err.stderr?.toString() ?? "",
        duration,
      };
    }

    if (result.exitCode !== 0) {
      const previewLines = result.stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .concat(result.stderr.trim().split("\n").filter(Boolean));
      logger.writeToConsole("FAILED", previewLines);
      const logPath = logger.writeLogFile(result, model);
      console.log(`    log: ${logPath}`);
      return result.exitCode;
    }

    const routed = routeOutput(result.stdout.trim(), job, WORKSPACE_ROOT);
    if (routed) console.log(`    written: ${routed}`);

    const previewLines = result.stdout.trim().split("\n").filter(Boolean).slice(0, 3);
    logger.writeToConsole("OK", previewLines);
    const logPath = logger.writeLogFile(result, model);

    if (result.stdout.trim().split("\n").filter(Boolean).length > 3) {
      console.log(`    log: ${logPath}`);
    }
    return 0;
  } finally {
    releaseLock(job.name, locksDir);
  }
}

function listJobs(jobs: Job[], config: CronConfig): void {
  const h = hostname().split(".")[0];
  console.log(`\nCron jobs (hostname: ${h}):\n`);
  console.log(`  ${"NAME".padEnd(30)} ${"SCHEDULE".padEnd(20)} ${"MODEL".padEnd(30)} ${"OUTPUT"}`);
  console.log(`  ${"".padEnd(30, "-")} ${"".padEnd(20, "-")} ${"".padEnd(30, "-")} ${"".padEnd(40, "-")}`);

  for (const job of jobs) {
    const model = job.model ?? config.default.model ?? "(default)";
    const output = job.output ?? "";
    const mode = job.prepend ? " (prepend)" : job.append ? " (append)" : "";
    const hostOk = !job.hostname || job.hostname === h;
    const status = hostOk ? "" : " (host skip)";
    console.log(`  ${job.name.padEnd(30)} ${job.cron.padEnd(20)} ${model.padEnd(30)} ${(output + mode).padEnd(40)}${status}`);
  }
  console.log();
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  const configPath = resolve(WORKSPACE_ROOT, ".opencode/cron.config.yaml");
  const config = loadConfig(configPath);

  if (args.installDefaults) {
    const sourceDir = resolve(WORKSPACE_ROOT, "scheduled");
    const targetDir = resolvePath(config.install_dir, WORKSPACE_ROOT);
    installDefaults(sourceDir, targetDir, true);
    return 0;
  }

  const jobDir = args.jobDir
    ? resolvePath(args.jobDir, WORKSPACE_ROOT)
    : resolvePath(config.install_dir, WORKSPACE_ROOT);

  if (!args.jobDir && (!existsSync(jobDir) || !readdirSync(jobDir).length)) {
    console.log(`Cron directory '${jobDir}' empty or missing. Installing defaults...`);
    const sourceDir = resolve(WORKSPACE_ROOT, "scheduled");
    installDefaults(sourceDir, jobDir);
  }

  const jobs = loadJobs(jobDir);

  if (!jobs.length) {
    console.log("No jobs found.");
    return 1;
  }

  if (args.list) {
    listJobs(jobs, config);
    return 0;
  }

  if (args.once) {
    const matched = jobs.filter(j => j.name === args.once);
    if (!matched.length) {
      console.log(`Job '${args.once}' not found.`);
      return 1;
    }
    return await runJob(matched[0], config, args.dryRun);
  }

  const now = new Date();
  const matchedJobs = jobs.filter(j => matches(j.cron, now));

  if (!matchedJobs.length) {
    console.log(`No jobs match the current time (${now.toISOString().slice(0, 16).replace("T", " ")}).`);
    return 0;
  }

  const h = hostname().split(".")[0];
  let exitCode = 0;
  for (const job of matchedJobs) {
    if (job.hostname && job.hostname !== h) {
      console.log(`  [${job.name}] SKIPPED (hostname restriction)`);
      continue;
    }
    const rc = await runJob(job, config, args.dryRun);
    if (rc === -1) {
      console.log(`  [${job.name}] SKIPPED (lock held by another process)`);
    } else if (rc !== 0) {
      exitCode = rc;
    }
  }

  return exitCode;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
  });
