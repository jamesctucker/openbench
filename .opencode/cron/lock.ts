import {
  openSync,
  writeSync,
  closeSync,
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(jobName: string, locksDir: string): boolean {
  mkdirSync(locksDir, { recursive: true });
  const lockPath = join(locksDir, `${jobName}.pid`);

  try {
    const fd = openSync(lockPath, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== "EEXIST") {
      console.warn(`Warning: could not acquire lock for ${jobName}: ${e.message}`);
      return false;
    }

    try {
      const existingPid = parseInt(readFileSync(lockPath, "utf-8").trim(), 10);
      if (!pidAlive(existingPid)) {
        unlinkSync(lockPath);
        try {
          const fd2 = openSync(lockPath, "wx");
          writeSync(fd2, String(process.pid));
          closeSync(fd2);
          return true;
        } catch {
          return false;
        }
      }
    } catch {
      // Stale lock — try to reap
      try { unlinkSync(lockPath); } catch { /* ignore */ }
      try {
        const fd3 = openSync(lockPath, "wx");
        writeSync(fd3, String(process.pid));
        closeSync(fd3);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function releaseLock(jobName: string, locksDir: string): void {
  const lockPath = join(locksDir, `${jobName}.pid`);
  try {
    unlinkSync(lockPath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
