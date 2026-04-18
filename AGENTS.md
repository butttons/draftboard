# @butttons/design

Local wireframing tool. Runs as `bunx @butttons/design` in a project folder. Reads/writes `.pi/design/`. Exposes an MCP server so AI agents can create and edit wireframes alongside the human using the GUI.

## Project structure in user's folder

<user-project>/
└── .pi/
└── design/
├── design.md # design conventions (spacing, colors, type, rules)
├── components.html # canonical component blocks (button, card, nav, etc.)
└── screens/
└── \*.html # individual wireframe screens

Everything is plain files on disk. No database. The filesystem is the source of truth.

## Stack

- TanStack Start (already set up) + React
- Bun runtime
- Hono-style server routes via Start's server functions / API routes
- Monaco editor for HTML/Markdown editing
- chokidar for file watching
- @modelcontextprotocol/sdk for the MCP server
- Server-Sent Events for pushing file changes to the browser
- Tailwind for styling

No database, no auth, no ORM.

## Routes

- `/` — Canvas. Grid of screen thumbnails.
- `/s/:name` — Editor. Monaco (HTML) on the left, live iframe preview on the right.
- `/design` — Monaco editing `design.md`.
- `/components` — Split view editing `components.html`.

Persistent left sidebar on all routes: list of screens, links to design.md and components.html.

## Server responsibilities

- Read/write files in `.pi/design/` on the cwd where the CLI was launched
- Scaffold `.pi/design/` with starter `design.md` + `components.html` if missing
- Watch `.pi/design/` with chokidar, broadcast changes over SSE to connected browsers
- Serve a `/mcp` endpoint (HTTP+SSE transport) that exposes tools to agents
- Serve the built frontend

## MCP tools to expose

Keep the surface small. Every tool operates on files in `.pi/design/` of the cwd.

- `list_screens()` → `[{ name, path, updated_at }]`
- `get_screen(name)` → `{ name, html }`
- `create_screen(name, html)` → writes `screens/<name>.html`, errors if exists
- `update_screen(name, html)` → overwrites
- `delete_screen(name)` → removes file
- `get_conventions()` → returns `design.md` + `components.html` concatenated, so the agent can pull both in one call before generating

Name validation: kebab-case, no path separators, no `..`.

## Live updates

When the MCP (or the user's editor, or git) writes a file in `.pi/design/`, chokidar fires, the server broadcasts `{ type: "screen_changed", name }` over SSE, the browser refetches that screen. Same for `design.md` and `components.html`. The canvas and editor must reflect external writes within ~200ms.

## CLI entry

`bin/@butttons/design.ts`:

- Parses optional `[dir]` arg (defaults to `process.cwd()`)
- Finds a free port (default 4321, fall back if taken)
- Starts the server
- Prints: the app URL, the MCP URL, and a copy-pasteable MCP config snippet
- Opens the browser (optional, behind `--open` or auto on first run)

## Canvas view

- Responsive grid, ~240px cards
- Each card: screen name (editable inline), small live iframe preview scaled down (not a screenshot), updated-at timestamp, delete button on hover
- "New screen" card at the end of the grid: prompts for name, creates empty screen from a starter template, navigates to editor
- Empty state: if no screens exist, show a prompt to create the first one or to connect an agent (show the MCP URL)

## Editor view

- Split pane, resizable, remember split ratio in localStorage
- Left: Monaco, HTML mode, auto-save on blur and on Cmd+S
- Right: iframe pointed at `/preview/:name` (a server route that serves the raw HTML with Tailwind CDN + a small reset injected)
- Top bar: breadcrumb back to canvas, screen name (rename writes a file rename on the server), delete button
- External changes (from MCP or editor) should update Monaco without clobbering unsaved edits — if the user has unsaved changes and the file changes externally, show a small "file changed on disk, reload?" banner

## Preview injection

When serving a screen for the iframe, wrap the user's HTML with:

- `<!doctype html>`, `<html>`, `<head>`, `<body>` if not present
- Tailwind via CDN (`https://cdn.tailwindcss.com`)
- Lucide icons via CDN
- A minimal reset

Do not modify the file on disk. Injection happens only in the served response.

## Starter `design.md`

Ship a default with sensible constraints: spacing scale limited to `p-2 p-4 p-6 p-8`, type scale `text-sm/base/lg/2xl`, zinc grays + one accent, `rounded-lg` + `border border-zinc-200`, no gradients, `shadow-sm` max, lucide icons only. The agent reads this before generating screens.

## Starter `components.html`

Ship ~10 canonical blocks: button (primary/secondary), input, card, nav bar, empty state, table row, modal, form field, avatar, badge. Each wrapped in a commented section the agent can reference.

## Non-goals for v1

- No flow/arrow editor between screens
- No multi-project switcher (one cwd = one project)
- No auth, accounts, cloud sync
- No AI calls from inside the app — agents connect via MCP
- No export feature — the files are already the export
- No headless-chromium thumbnails — use live iframes scaled down
- No collaboration

## Long-term constraints

- Ship as a single npm package. `bunx @butttons/design` must work with zero config.
- The MCP tool schema is the stable public API. Treat changes to it like breaking API changes.
- Never store state that isn't recoverable from the files in `.pi/design/`. If the process dies or the npm package is uninstalled, the user's work is untouched and openable in any editor.
- Keep dependencies minimal. Every added dep is future maintenance.
