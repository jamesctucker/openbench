#!/usr/bin/env node

/**
 * Goodreads MCP Server — proxies Piratereads API as MCP tools.
 *
 * Endpoints exposed:
 *   goodreads_currently_reading  – books on your "currently-reading" shelf
 *   goodreads_read               – books on your "read" shelf
 *   goodreads_want_to_read       – books on your "want-to-read" shelf
 *   goodreads_dnf                – books on your "dnf" (did not finish) shelf
 *
 * Set GOODREADS_USER_ID (or rely on the default).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const USER_ID = process.env.GOODREADS_USER_ID;
if (!USER_ID) {
  console.error("Error: Set GOODREADS_USER_ID env var (your Goodreads user ID).");
  process.exit(1);
}
const BASE_URL = "https://api.piratereads.com";

const SHELVES = {
  currently_reading: "currently-reading",
  read: "read",
  want_to_read: "want-to-read",
  dnf: "dnf",
};

const SHELF_DESCRIPTIONS = {
  currently_reading:
    "Get books the user is currently reading. Returns title, author, cover, rating, and review.",
  read: 'Get books the user has read (the "read" shelf). Returns title, author, cover, rating, and review.',
  want_to_read:
    'Get books on the user\'s "want to read" shelf. Returns title, author, and cover.',
  dnf: 'Get books the user did not finish ("dnf" shelf). Returns title, author, cover, rating, and review.',
};

/**
 * Fetch a shelf from Piratereads.
 */
async function fetchShelf(shelf, perPage = 100, page = 1) {
  const url = new URL(`/${USER_ID}/${shelf}`, BASE_URL);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Piratereads ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Format a book object into readable markdown-ish text.
 */
function formatBook(b) {
  const lines = [`**${b.book_title}** by ${b.book_author}`];
  if (b.rating) lines.push(`Rating: ${b.rating}/5`);
  if (b.avg_rating) lines.push(`Avg rating: ${b.avg_rating}/5`);
  if (b.review_text) lines.push(`Review: ${b.review_text}`);
  if (b.review_published_on)
    lines.push(`Reviewed: ${b.review_published_on}`);
  if (b.book_link) lines.push(`[Goodreads](${b.book_link})`);
  return lines.join("\n");
}

// ── MCP server ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "goodreads", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(SHELF_DESCRIPTIONS).map(([key, desc]) => ({
    name: `goodreads_${key}`,
    description: desc,
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "integer",
          description: "Page number (default 1)",
          default: 1,
        },
        per_page: {
          type: "integer",
          description: "Results per page (default 100, max 200)",
          default: 100,
        },
      },
    },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Determine which shelf key to use
  const shelfKey = name.replace("goodreads_", "");
  const shelfSlug = SHELVES[shelfKey];

  if (!shelfSlug) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const page = args?.page || 1;
  const perPage = Math.min(args?.per_page || 100, 200);

  try {
    const data = await fetchShelf(shelfSlug, perPage, page);
    const count = data.count ?? data.books?.length ?? 0;
    const header = `Shelf: ${shelfKey} | Total: ${count} | Page ${page} (${perPage}/page)\n`;
    const body = (data.books || [])
      .map(formatBook)
      .join("\n\n---\n\n");

    return {
      content: [{ type: "text", text: header + "\n" + body }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error fetching shelf: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);