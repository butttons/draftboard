# @butttons/draftboard

Local wireframing tool. Runs as `bunx @butttons/draftboard` in a project folder. Reads and writes plain HTML and Markdown files in `.pi/design/`, and exposes an MCP server so AI agents can create and edit wireframes alongside you in the GUI.

The filesystem is the source of truth. No database, no auth, no cloud sync. If you uninstall the package, your work is untouched and openable in any editor.

## Quick start

Run it in any project folder:

```bash
bunx @butttons/draftboard
```

The CLI picks a free port (default `4321`), scaffolds `.pi/design/` if missing, prints the app URL and an MCP config snippet, and opens the browser.

## Project layout

```
<your-project>/
└── .pi/
    └── design/
        ├── design.md         # conventions: spacing, type, colors, rules
        ├── components.html   # canonical component blocks
        └── screens/
            └── *.html        # individual wireframe screens
```

## Routes

- `/` — Canvas. Grid of live screen thumbnails.
- `/s/:name` — Editor. Monaco on the left, live iframe preview on the right.
- `/design` — Edit `design.md`.
- `/components` — Edit `components.html`.

External writes (from an agent, your editor, or git) stream into the browser over SSE and reflect within ~200ms.

## MCP

The server exposes an MCP endpoint at `/mcp` with a small tool surface:

- `list_screens()`
- `get_screen(name)`
- `create_screen(name, html)`
- `update_screen(name, html)`
- `delete_screen(name)`
- `get_conventions()` — returns `design.md` + `components.html` concatenated

Screen names are kebab-case, no path separators.

## Stack

TanStack Start + React, Bun runtime, Monaco editor, chokidar for file watching, `@modelcontextprotocol/sdk` for MCP, Tailwind for styling.

## URLs

- Dev: https://draftboard.dev.localhost
- Prod: https://draftboard.localhost

## Development

```bash
bun install
bun run dev        # vite dev on :3000
bun run build
bun run check      # biome lint + format
bun run test       # vitest
```
