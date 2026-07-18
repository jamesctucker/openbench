import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { acquireLock, releaseLock } from "../../.opencode/cron/lock";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("lock.ts", () => {
  const locksDir = join(tmpdir(), `cron-test-locks-${Date.now()}`);

  beforeAll(() => {
    mkdirSync(locksDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(locksDir, { recursive: true, force: true });
  });

  it("should acquire and release a lock", () => {
    const acquired = acquireLock("test-lock", locksDir);
    expect(acquired).toBe(true);

    const lockPath = join(locksDir, "test-lock.pid");
    expect(existsSync(lockPath)).toBe(true);

    releaseLock("test-lock", locksDir);
    expect(existsSync(lockPath)).toBe(false);
  });

  it("should block concurrent acquire", () => {
    acquireLock("concurrent-test", locksDir);
    const secondAcquire = acquireLock("concurrent-test", locksDir);
    expect(secondAcquire).toBe(false);

    releaseLock("concurrent-test", locksDir);
  });

  it("should reap stale locks", () => {
    // Write a lock file with a dead PID
    const lockPath = join(locksDir, "stale-lock.pid");
    writeFileSync(lockPath, "99999"); // PID that shouldn't exist
    const acquired = acquireLock("stale-lock", locksDir);
    expect(acquired).toBe(true);

    releaseLock("stale-lock", locksDir);
  });

  it("releaseLock should not throw on missing lock", () => {
    expect(() => releaseLock("nonexistent", locksDir)).not.toThrow();
  });
});
