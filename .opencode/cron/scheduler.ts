import { Cron } from "croner";

export function isValid(expression: string): boolean {
  try {
    new Cron(expression);
    return true;
  } catch {
    return false;
  }
}

export function matches(expression: string, date?: Date): boolean {
  try {
    const now = date ?? new Date();
    const cron = new Cron(expression);

    // 5-field cron matches at second 0 only — round to the minute
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0, 0);

    return cron.match(minuteStart);
  } catch {
    return false;
  }
}

export function getNextRun(expression: string, date?: Date): Date | null {
  try {
    const now = date ?? new Date();
    const cron = new Cron(expression);
    const next = cron.nextRun(now);
    return next ?? null;
  } catch {
    return null;
  }
}
