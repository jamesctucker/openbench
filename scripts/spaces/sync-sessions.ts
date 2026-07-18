#!/usr/bin/env bun
/**
 * sync-sessions.ts — Reconcile OpenCode session history for spaces.
 *
 * Scans OpenCode sessions for `<!-- space: <name> -->` markers in message
 * content, then writes matching sessions into each space's SESSIONS.md.
 *
 * Two modes:
 *   --space <name>   Sync only that space (fast, used by space-loader on load)
 *   (no args)        Full sync across all spaces (used by cron)
 *
 * Usage:
 *   bun run scripts/spaces/sync-sessions.ts                 # full sync
 *   bun run scripts/spaces/sync-sessions.ts --space flip-advisor  # scoped sync
 *
 * Requires a running OpenCode server (default: http://localhost:4096).
 * If no server is reachable, exits gracefully with a warning.
 */

import { createOpencodeClient } from "@opencode-ai/sdk";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { hostname } from "node:os";

const WORKSPACE = import.meta.dir.replace("/scripts/spaces", "");
const SPACES_DIR = join(WORKSPACE, "spaces");
const SERVER_URL = process.env.OPENCODE_SERVER_URL ?? "http://localhost:4096";
const HOST = hostname().trim();

interface SessionEntry {
  sessionId: string;
  host: string;
  date: string;
  title: string;
}

function getSpaceNames(): string[] {
  if (!existsSync(SPACES_DIR)) return [];
  return readdirSync(SPACES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .filter((d) => existsSync(join(SPACES_DIR, d.name, "INSTRUCTIONS.md")))
    .map((d) => d.name)
    .sort();
}

function parseArgs(): { space?: string } {
  const args = process.argv.slice(2);
  let space: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--space" && args[i + 1]) {
      space = args[i + 1];
      i++;
    }
  }
  return { space };
}

function extractSpaceMarkers(text: string): string[] {
  const regex = /<!--\s*space:\s*([\w-]+)\s*-->/gi;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].toLowerCase();
    if (!matches.includes(name)) {
      matches.push(name);
    }
  }
  return matches;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toISOString().slice(0, 10);
}

function escapeMarkdownTable(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function renderSessionsMd(entries: SessionEntry[]): string {
  const lines: string[] = [
    "# Sessions",
    "",
    "<!-- Auto-populated by scripts/spaces/sync-sessions.ts",
    "     DO NOT EDIT BY HAND — changes will be overwritten on next sync. -->",
    "",
    "| Session ID | Host | Date | Title |",
    "|------------|------|------|-------|",
  ];

  for (const entry of entries) {
    lines.push(
      `| ${entry.sessionId} | ${escapeMarkdownTable(entry.host)} | ${entry.date} | ${escapeMarkdownTable(entry.title)} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function readExistingSessions(sessionsMdPath: string): SessionEntry[] {
  if (!existsSync(sessionsMdPath)) return [];
  const content = readFileSync(sessionsMdPath, "utf-8");
  const entries: SessionEntry[] = [];
  const lineRegex = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/;

  for (const line of content.split("\n")) {
    if (line.startsWith("|--") || line.startsWith("| Session") || !line.startsWith("|")) continue;
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, sessionId, host, date, title] = match;
    entries.push({
      sessionId: sessionId.trim(),
      host: host.trim(),
      date: date.trim(),
      title: title.trim(),
    });
  }
  return entries;
}

function dedupeEntries(entries: SessionEntry[]): SessionEntry[] {
  const seen = new Set<string>();
  const result: SessionEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.host}:${entry.sessionId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}

async function syncSpaces(targetSpace?: string) {
  const client = createOpencodeClient({ baseUrl: SERVER_URL });

  let sessions: Awaited<ReturnType<typeof client.session.list>>;
  try {
    const result = await client.session.list({
      query: { directory: WORKSPACE },
    });
    if (!result.data) {
      console.error("Failed to list sessions: no data returned");
      return;
    }
    sessions = result.data as any;
  } catch (e) {
    console.error(
      `Could not connect to OpenCode server at ${SERVER_URL}. Is it running?`,
    );
    console.error(`Error: ${(e as Error).message}`);
    return;
  }

  if (!Array.isArray(sessions) || sessions.length === 0) {
    console.log("No OpenCode sessions found.");
    if (targetSpace) {
      console.log(`(Scoped sync for space: ${targetSpace})`);
    }
    return;
  }

  console.log(`Found ${sessions.length} sessions. Scanning for space markers...`);

  const spaceNames = targetSpace ? [targetSpace] : getSpaceNames();
  if (targetSpace && !existsSync(join(SPACES_DIR, targetSpace, "INSTRUCTIONS.md"))) {
    console.error(`Space "${targetSpace}" not found or missing INSTRUCTIONS.md`);
    return;
  }

  const spaceToSessions: Map<string, SessionEntry[]> = new Map();
  for (const name of spaceNames) {
    spaceToSessions.set(name, []);
  }

  for (const session of sessions as any[]) {
    if (!session.id) continue;

    let messagesResult: Awaited<ReturnType<typeof client.session.messages>>;
    try {
      messagesResult = await client.session.messages({
        path: { id: session.id },
        query: { directory: WORKSPACE },
      });
    } catch {
      continue;
    }

    if (!messagesResult.data || !Array.isArray(messagesResult.data)) continue;

    const foundSpaces = new Set<string>();

    for (const msg of messagesResult.data as any[]) {
      if (!msg.parts || !Array.isArray(msg.parts)) continue;
      for (const part of msg.parts) {
        if (part.type === "text" && typeof part.text === "string") {
          const markers = extractSpaceMarkers(part.text);
          for (const marker of markers) {
            if (spaceToSessions.has(marker)) {
              foundSpaces.add(marker);
            }
          }
        }
      }
    }

    if (foundSpaces.size === 0) continue;

    const entry: SessionEntry = {
      sessionId: session.id,
      host: HOST,
      date: formatDate(session.time?.created ?? Date.now()),
      title: session.title || "(untitled)",
    };

    for (const spaceName of foundSpaces) {
      spaceToSessions.get(spaceName)!.push(entry);
    }
  }

  let updated = 0;
  for (const [spaceName, newEntries] of spaceToSessions) {
    const sessionsMdPath = join(SPACES_DIR, spaceName, "SESSIONS.md");

    const existing = readExistingSessions(sessionsMdPath);
    const combined = dedupeEntries([...existing, ...newEntries]);
    combined.sort((a, b) => b.date.localeCompare(a.date));

    const output = renderSessionsMd(combined);

    if (output !== readFileSync(sessionsMdPath, "utf-8").replace(/\s+$/, "") + "\n") {
      writeFileSync(sessionsMdPath, output);
      updated++;
    }

    console.log(
      `  ${spaceName}: ${newEntries.length} new, ${combined.length} total sessions`,
    );
  }

  console.log(`Sync complete. ${updated} space(s) updated.`);
}

const { space } = parseArgs();
syncSpaces(space).catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
