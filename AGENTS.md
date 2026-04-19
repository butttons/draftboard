# @butttons/draftboard

Local wireframing tool. Runs as `npx @butttons/draftboard` in a project folder. Reads/writes `.draftboard/`. Exposes an MCP server so AI agents can create and edit wireframes alongside the human using the GUI.

The directory is configurable via `--dir` flag or `DRAFTBOARD_DIR` env var.

## Project structure in user's folder

<user-project>/
└── .draftboard/
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
- Commander for CLI parsing

No database, no auth, no ORM.

## Routes

- `/` — Canvas. Grid of screen thumbnails.
- `/s/:name` — Editor. Monaco (HTML) on the left, live iframe preview on the right.
- `/p/:name` — Standalone screen preview with live reload.
- `/c/:name` — Standalone component preview (iframed by `/components`), supports `?variant=`.
- `/design` — Monaco editing `design.md`.
- `/components` — Rendered library of blocks parsed from `components.html`; each block is iframed from `/c/:name` so styles don't bleed.

Persistent left sidebar on all routes: list of screens, links to design.md and components.html.

## Server responsibilities

- Read/write files in the design directory on the cwd where the CLI was launched
- Scaffold the design directory with starter `design.md` + `components.html` if missing
- Watch the design directory with chokidar, broadcast changes over SSE to connected browsers
- Serve a `/mcp` endpoint (HTTP+SSE transport) that exposes tools to agents
- Serve the built frontend

## MCP tools

Every tool operates on files in the design directory of the cwd. Screen names are kebab-case with no path separators or `..`. Component names allow dashes (`info-card`).

**Project**

- `init_project()` — scaffold `design.md`, `components.html`, `layout.html` if missing.
- `get_conventions()` → design.md + formatted component catalog + layout, intended for a single read-before-generate call.

**Screens**

- `list_screens()` → `[{ name, path, updated_at }]`
- `get_screen(name, start?, end?)` → full HTML or a line-range slice `{ name, lines, start, end, total }`
- `create_screen(name, html)` — errors if already exists
- `update_screen(name, html, start?, end?)` — full rewrite or partial line-range patch
- `delete_screen(name)`
- `rename_screen({ from, to, update_links? })` — renames the file; when `update_links` is true (default), rewrites `<a href>` references in every other screen atomically and returns `{ renamed, links_updated: [{ screen_name, count }] }`.

**Design doc & layout** (global — changes affect every future generation)

- `get_design_doc()` → raw design.md source for editing
- `update_design_doc({ content })` — full-file replace of design.md
- `update_layout({ content })` — full-file replace of layout.html

**Components**

- `list_components()` → `[{ name, variant?, props, slots }]`
- `get_component(name, variant?)` → HTML snippet with `{{prop}}` placeholders and `<!-- slot:name -->` markers
- `upsert_component({ name, html, variant? })` — create or replace a component block in components.html; markers are generated for you
- `delete_component({ name, variant? })` — remove a component block

**Markers inside screens**

- `list_markers_in_screen({ name })` → every marker in source order with parsed props and line ranges
- `replace_component_in_screen({ screen_name, marker_name, occurrence?, html })` — surgically replace the inner HTML of a marker block, preserving the start/end tags. `occurrence` is 0-indexed; negative values count from the end; `"all"` replaces every occurrence.

**Validation & references**

- `validate_screen({ name })` → `{ issues: [{ severity, line, message, marker? }] }`. Checks: off-palette colors/hex against design.md, bare component tags missing markers, unknown marker names (info only — page-layout markers are legitimate), malformed markers, dead `/p/*` links.
- `validate_all_screens()` → `{ [screen_name]: issues[] }`.
- `find_screens_using({ marker_name })` → `[{ screen_name, occurrences }]`. Use before editing or deleting a component.
- `find_screens_linking_to({ screen_name })` → `[{ screen_name, occurrences }]`. Use before renaming or deleting a screen (though `rename_screen` handles the rewrite itself).

## Marker format

Every component inside a screen is wrapped in HTML comment markers so the tools above can find and edit them:

```html
<!-- button:start variant=primary label="Save" -->
<button class="...">Save</button>
<!-- button:end -->
```

Name resolution is by family: `<!-- button:start variant=primary -->` resolves against the `button` component regardless of the specific `button:primary` variant. Variants are just props.

## Typical agent workflows

- **Clean-room regenerate**: `init_project` → `get_conventions` → `create_screen` (repeat).
- **Evolve style guide**: `get_design_doc` → `update_design_doc` → `validate_all_screens` → targeted `replace_component_in_screen` or `update_screen` calls on affected screens.
- **Evolve a shared component**: `find_screens_using` to gauge blast radius → `upsert_component` → `validate_all_screens`.
- **Rename a screen without breaking links**: `rename_screen({ from, to })` (update_links defaults to true).

## Live updates

When the MCP (or the user's editor, or git) writes a file in the design directory, chokidar fires, the server broadcasts `{ type: "screen_changed", name }` over SSE, the browser refetches that screen. Same for `design.md` and `components.html`. The canvas and editor must reflect external writes within ~200ms.

## URLs

- Dev: https://draftboard.dev.localhost
- Prod: https://draftboard.localhost

## CLI entry

`bin/draftboard.ts` (Commander):

- Options: `--port`, `--dir`, `--open`
- Finds a free port (default 4321, fall back if taken)
- Starts the server
- Prints: the app URL, the MCP URL, and a copy-pasteable MCP config snippet
- Opens the browser (optional, behind `--open`)

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

- Ship as a single npm package. `npx @butttons/draftboard` must work with zero config.
- The MCP tool schema is the stable public API. Treat changes to it like breaking API changes.
- Never store state that isn't recoverable from the files in the design directory. If the process dies or the npm package is uninstalled, the user's work is untouched and openable in any editor.
- Keep dependencies minimal. Every added dep is future maintenance.
