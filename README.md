# @butttons/draftboard

Local wireframing tool. Runs as `bunx @butttons/draftboard` in a project folder. Reads and writes plain HTML and Markdown files in `.draftboard/`, and exposes an MCP server so AI agents can create and edit wireframes alongside you in the GUI.

The filesystem is the source of truth. No database, no auth, no cloud sync. If you uninstall the package, your work is untouched and openable in any editor.

## Quick start

Run it in any project folder:

```bash
bunx @butttons/draftboard
```

The CLI picks a free port (default `4321`), scaffolds `.draftboard/` if missing, prints the app URL and an MCP config snippet, and opens the browser.

## With portless

For nicer local URLs, use [portless](https://github.com/butttons/portless):

```bash
portless draftboard bunx @butttons/draftboard
```

This gives you `https://draftboard.localhost` instead of `http://localhost:4321`.

## CLI

```
Options:
  -p, --port <number>   port number (default: 4321)
  -d, --dir <path>      design directory (default: .draftboard)
  --open                open browser on start
```

The directory can also be set via the `DRAFTBOARD_DIR` environment variable.

## Project layout

```
<your-project>/
└── .draftboard/
    ├── design.md         # conventions: spacing, type, colors, rules
    ├── components.html   # canonical component blocks
    └── screens/
        └── *.html        # individual wireframe screens
```

## Routes

- `/` — Canvas. Grid of live screen thumbnails.
- `/s/:name` — Editor. Monaco on the left, live iframe preview on the right.
- `/p/:name` — Standalone preview with live reload.
- `/design` — Edit `design.md`.
- `/components` — Edit `components.html`.

External writes (from an agent, your editor, or git) stream into the browser over SSE and reflect within ~200ms.

## MCP

The server exposes an MCP endpoint at `/mcp` with a small tool surface:

- `list_screens()` — list all screens
- `get_screen(name)` — get screen HTML
- `create_screen(name, html)` — create a new screen
- `update_screen(name, html)` — update screen HTML
- `delete_screen(name)` — delete a screen
- `get_conventions()` — returns `design.md` + `components.html` concatenated
- `list_components()` — list available UI components
- `get_component(name, variant?)` — get a component HTML snippet

Screen names are kebab-case, no path separators.

## Stack

TanStack Start + React, Bun runtime, Commander for CLI, Monaco editor, chokidar for file watching, `@modelcontextprotocol/sdk` for MCP, Tailwind for styling.

## Development

```bash
bun install
bun run dev        # vite dev at draftboard.dev.localhost
bun run build
bun run check      # biome lint + format
bun run test       # vitest
```
