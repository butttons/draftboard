# @butttons/draftboard

Local wireframing tool. Runs as `npx @butttons/draftboard` in a project folder. Reads and writes plain HTML and Markdown files in `.draftboard/`, and exposes an MCP server so AI agents can create and edit wireframes alongside you in the GUI.

The filesystem is the source of truth. No database, no auth, no cloud sync. If you uninstall the package, your work is untouched and openable in any editor.

## Quick start

Run it in any project folder:

```bash
npx @butttons/draftboard
```

The CLI picks a free port (default `4321`), scaffolds `.draftboard/` if missing, prints the app URL and an MCP config snippet, and opens the browser.

## With portless

For nicer local URLs, use [portless](https://github.com/vercel-labs/portless):

```bash
portless draftboard npx @butttons/draftboard
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
- `/s/:name` — Editor. Monaco + live iframe preview.
- `/p/:name` — Standalone screen preview with live reload.
- `/c/:name` — Standalone component preview with live reload (supports `?variant=`).
- `/design` — Edit `design.md`.
- `/components` — Rendered library of blocks parsed from `components.html`.

External writes (from an agent, your editor, or git) stream into the browser over SSE and reflect within ~200ms.

## MCP

The server exposes an MCP endpoint at `/mcp`. Tools fall into five groups:

### Project

- `init_project()` — scaffold `design.md`, `components.html`, `layout.html` if missing.
- `get_conventions()` — read-only bundle of `design.md` + component catalog + layout.

### Screens

- `list_screens()` — list all screens with paths and `updated_at`.
- `get_screen(name, start?, end?)` — full HTML or a line range.
- `create_screen(name, html)` — create; errors if it already exists.
- `update_screen(name, html, start?, end?)` — full rewrite or line-range patch.
- `delete_screen(name)` — remove a screen.
- `rename_screen(from, to, update_links?)` — atomic rename with `<a href>` rewriting across other screens.

### Design doc & layout

- `get_design_doc()` — raw `design.md` contents for editing.
- `update_design_doc(content)` — full-file replace of `design.md`.
- `update_layout(content)` — full-file replace of `layout.html`.

### Components

- `list_components()` — component catalog with variants, props, slots.
- `get_component(name, variant?)` — HTML snippet with `{{prop}}` placeholders and `<!-- slot:name -->` markers.
- `upsert_component(name, html, variant?)` — create or replace a component block in `components.html`.
- `delete_component(name, variant?)` — remove a component block.

### Markers, validation, references

- `list_markers_in_screen(name)` — every `<!-- name:start ... -->` in order with parsed props and line ranges.
- `replace_component_in_screen(screen_name, marker_name, occurrence?, html)` — surgically replace the inner HTML of a marker block. `occurrence` can be a 0-indexed number (negative counts from the end) or `"all"`.
- `validate_screen(name)` — lint a screen against `design.md`: off-palette colors, bare component tags missing markers, unknown marker names, malformed markers, dead `/p/*` links.
- `validate_all_screens()` — run the linter across every screen.
- `find_screens_using(marker_name)` — screens that contain at least one marker with the given name. Use before editing or deleting a component.
- `find_screens_linking_to(screen_name)` — screens with an `<a href>` pointing at the given screen. Use before renaming or deleting.

Screen names are kebab-case, no path separators. Component names accept dashes (`info-card`).

### Connecting agents

#### Claude Code

```bash
claude mcp add --transport http draftboard http://localhost:4321/mcp
```

Manage servers: `claude mcp list`, `claude mcp remove draftboard`

#### OpenCode

```bash
opencode mcp add
```

Or add to `~/.opencode/config.json`:

```json
{
  "mcp": {
    "draftboard": {
      "type": "remote",
      "url": "http://localhost:4321/mcp",
      "enabled": true
    }
  }
}
```

#### Pi

Draftboard ships with a pi extension that registers all MCP tools automatically:

```bash
pi install git:github.com/butttons/draftboard
```

Or drop `.pi/extensions/draftboard.ts` into your project. The extension auto-detects the running draftboard server.

#### Raw MCP config

```json
{
  "mcpServers": {
    "draftboard": {
      "url": "http://localhost:4321/mcp"
    }
  }
}
```

## Stack

TanStack Start + React, Node.js runtime, Commander for CLI, Monaco editor, chokidar for file watching, `@modelcontextprotocol/sdk` for MCP, Tailwind for styling.

## Development

```bash
pnpm install
pnpm dev        # vite dev at draftboard.dev.localhost
```
