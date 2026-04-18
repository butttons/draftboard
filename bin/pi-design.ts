#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--")) || process.cwd();
const openBrowser = args.includes("--open");

// Scaffold design directory
const designDir = join(dir, ".pi", "design");
const screensDir = join(designDir, "screens");

if (!existsSync(designDir)) {
  mkdirSync(designDir, { recursive: true });
}
if (!existsSync(screensDir)) {
  mkdirSync(screensDir, { recursive: true });
}

const designMdPath = join(designDir, "design.md");
if (!existsSync(designMdPath)) {
  writeFileSync(designMdPath, DEFAULT_DESIGN_MD);
}

const componentsPath = join(designDir, "components.html");
if (!existsSync(componentsPath)) {
  writeFileSync(componentsPath, DEFAULT_COMPONENTS_HTML);
}

// Find free port starting from 4321
async function findFreePort(start: number): Promise<number> {
  const net = await import("node:net");
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, () => {
      server.close(() => resolve(start));
    });
    server.on("error", () => {
      resolve(findFreePort(start + 1));
    });
  });
}

const port = await findFreePort(4321);

console.log(`
  pi-design

  App:  http://localhost:${port}
  MCP:  http://localhost:${port}/mcp

  MCP config for agents:
  {
    "mcpServers": {
      "pi-design": {
        "url": "http://localhost:${port}/mcp"
      }
    }
  }
`);

if (openBrowser) {
  const url = `http://localhost:${port}`;
  const platform = process.platform;
  if (platform === "darwin") {
    execSync(`open ${url}`);
  } else if (platform === "win32") {
    execSync(`start ${url}`);
  } else {
    execSync(`xdg-open ${url}`);
  }
}

// Start vite dev server
execSync(`bunx vite --port ${port} --host`, {
  cwd: join(import.meta.dirname, ".."),
  stdio: "inherit",
});

const DEFAULT_DESIGN_MD = `# Design Conventions

## Spacing
- Use only: \`p-2\` \`p-4\` \`p-6\` \`p-8\`
- Gap: \`gap-2\` \`gap-4\` \`gap-6\`
- Margin: \`m-2\` \`m-4\` \`m-6\`

## Typography
- Sizes: \`text-sm\` \`text-base\` \`text-lg\` \`text-2xl\`
- Headings: semibold, not bold
- Body: \`text-zinc-600\`

## Colors
- Backgrounds: \`bg-white\` \`bg-zinc-50\` \`bg-zinc-100\`
- Text: \`text-zinc-900\` \`text-zinc-600\` \`text-zinc-400\`
- Accent: \`text-blue-600\` \`bg-blue-600\`
- Borders: \`border-zinc-200\`

## Borders & Shadows
- Border: \`border border-zinc-200\`
- Radius: \`rounded-lg\`
- Shadow: \`shadow-sm\` maximum, no larger shadows

## Icons
- Use Lucide icons only

## Rules
- No gradients
- No custom colors outside the zinc + blue palette
- Keep it simple and clean
`;

const DEFAULT_COMPONENTS_HTML = `<!-- Button Primary -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
  Button
</button>

<!-- Button Secondary -->
<button class="border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition">
  Button
</button>

<!-- Input -->
<input
  type="text"
  placeholder="Enter text..."
  class="border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>

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
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Link</a>
    </div>
  </div>
</nav>

<!-- Empty State -->
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
    <span class="text-zinc-400">Icon</span>
  </div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">No items yet</h3>
  <p class="text-sm text-zinc-600 mb-4">Get started by creating your first item.</p>
  <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
    Create
  </button>
</div>

<!-- Table Row -->
<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded-full bg-zinc-200"></div>
    <div>
      <p class="text-sm font-medium text-zinc-900">Name</p>
      <p class="text-sm text-zinc-600">email@example.com</p>
    </div>
  </div>
  <span class="text-sm text-zinc-400">2h ago</span>
</div>

<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-sm">
    <h3 class="text-lg font-semibold text-zinc-900 mb-2">Modal Title</h3>
    <p class="text-sm text-zinc-600 mb-4">Modal content goes here.</p>
    <div class="flex justify-end gap-2">
      <button class="border border-zinc-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
      <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Confirm</button>
    </div>
  </div>
</div>

<!-- Form Field -->
<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">Label</label>
  <input
    type="text"
    placeholder="Placeholder"
    class="w-full border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <p class="text-sm text-zinc-400">Helper text</p>
</div>

<!-- Avatar -->
<div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
  <span class="text-sm font-medium text-zinc-600">JD</span>
</div>

<!-- Badge -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">
  Badge
</span>
`;
