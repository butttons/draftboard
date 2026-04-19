#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";

const DESIGN_MD = `# Design Conventions

## Preview
- Screens are viewable at \`/p/<screen-name>\`

## Spacing
- Use: \`p-2\` \`p-4\` \`p-6\` \`p-8\`
- Gap: \`gap-2\` \`gap-4\` \`gap-6\`

## Typography
- Sizes: \`text-sm\` \`text-base\` \`text-lg\` \`text-2xl\`
- Headings: semibold
- Body: \`text-zinc-600\`

## Colors
- Backgrounds: \`bg-white\` \`bg-zinc-50\` \`bg-zinc-100\`
- Text: \`text-zinc-900\` \`text-zinc-600\` \`text-zinc-400\`
- Accent: \`text-blue-600\` \`bg-blue-600\`
- Borders: \`border-zinc-200\`

## Style
- Border: \`border border-zinc-200\`
- Radius: \`rounded-lg\`
- Shadow: \`shadow-sm\`
- Icons: Lucide only
- No gradients
`;

const LAYOUT_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
  {{content}}
  <script>
    if(window.lucide)lucide.createIcons();
    (function(){var n=window.location.pathname.split('/').pop(),e=new EventSource('/sse');e.onmessage=function(ev){try{var d=JSON.parse(ev.data);if(d.type==='screen_changed'&&d.name===n)window.location.reload()}catch(x){}}})();
  </script>
</body>
</html>`;

const COMPONENTS_HTML = `<!-- Button Primary -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Button</button>

<!-- Button Secondary -->
<button class="border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition">Button</button>

<!-- Input -->
<input type="text" placeholder="Enter text..." class="border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>

<!-- Card -->
<div class="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm">
  <h3 class="text-base font-semibold text-zinc-900 mb-2">Card Title</h3>
  <p class="text-sm text-zinc-600">Card content goes here.</p>
</div>

<!-- Nav Bar -->
<nav class="border-b border-zinc-200 bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">Logo</span>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Link</a>
    </div>
  </div>
</nav>

<!-- Empty State -->
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-4"><span class="text-zinc-400">Icon</span></div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">No items yet</h3>
  <p class="text-sm text-zinc-600 mb-4">Get started by creating your first item.</p>
  <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Create</button>
</div>

<!-- Form Field -->
<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">Label</label>
  <input type="text" placeholder="Placeholder" class="w-full border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
  <p class="text-sm text-zinc-400">Helper text</p>
</div>`;

async function findFreePort(start: number): Promise<number> {
  const net = await import("node:net");
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, () => server.close(() => resolve(start)));
    server.on("error", () => resolve(findFreePort(start + 1)));
  });
}

const program = new Command();

program
  .name("draftboard")
  .description("Local wireframing tool with MCP server for AI agents")
  .version("0.0.5")
  .option("-p, --port <number>", "port number (default: 4321)")
  .option("-d, --dir <path>", "design directory (default: .draftboard)")
  .option("--open", "open browser on start")
  .action(async (opts) => {
    const cwd = process.cwd();

    // Resolve design directory
    const designDirName = opts.dir ?? process.env.DRAFTBOARD_DIR ?? ".draftboard";
    process.env.DRAFTBOARD_DIR = designDirName;

    // Scaffold design directory
    const designDir = join(cwd, designDirName);
    const screensDir = join(designDir, "screens");

    for (const d of [designDir, screensDir]) {
      if (!existsSync(d)) mkdirSync(d, { recursive: true });
    }

    const defaults: Record<string, string> = {
      "design.md": DESIGN_MD,
      "components.html": COMPONENTS_HTML,
      "layout.html": LAYOUT_HTML,
    };

    for (const [file, content] of Object.entries(defaults)) {
      const path = join(designDir, file);
      if (!existsSync(path)) writeFileSync(path, content);
    }

    // Resolve port
    const requestedPort = Number.parseInt(
      opts.port ?? process.env.PORT ?? process.env.NITRO_PORT ?? "",
      10,
    );
    const port =
      Number.isFinite(requestedPort) && requestedPort > 0
        ? requestedPort
        : await findFreePort(4321);
    process.env.PORT = String(port);
    process.env.NITRO_PORT = String(port);

    console.log(`
  @butttons/draftboard

  App:  http://localhost:${port}
  MCP:  http://localhost:${port}/mcp

  MCP config:
  { "mcpServers": { "design": { "url": "http://localhost:${port}/mcp" } } }
`);

    if (opts.open) {
      const url = `http://localhost:${port}`;
      execSync(
        process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`,
      );
    }

    // Start server
    await import(
      join(import.meta.dirname, "..", ".output", "server", "index.mjs")
    );
  });

program.parse();
