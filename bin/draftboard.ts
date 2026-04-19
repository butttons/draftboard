#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";

const DEFAULT_DESIGN_MD = `# Design Conventions

## Preview
- Screens are viewable at \`/p/<screen-name>\`

## Spacing
- Use only: \`p-2\` \`p-4\` \`p-6\` \`p-8\`
- Gap: \`gap-2\` \`gap-4\` \`gap-6\`

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
- Shadow: \`shadow-sm\` maximum

## Icons
- Use Lucide icons only

## Rules
- No gradients
- Keep it simple and clean
`;

const DEFAULT_COMPONENTS_HTML = `<!-- button:start variant=primary label="Button" -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">{{label}}</button>
<!-- button:end -->

<!-- button:start variant=secondary label="Button" -->
<button class="border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition">{{label}}</button>
<!-- button:end -->

<!-- input:start placeholder="Enter text..." -->
<input type="text" placeholder="{{placeholder}}" class="border border-zinc-200 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"/>
<!-- input:end -->

<!-- card:start title="Card Title" -->
<div class="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden">
  <div class="px-4 py-3 border-b border-zinc-200">
    <h3 class="text-base font-semibold text-zinc-900">{{title}}</h3>
  </div>
  <div class="p-4">
    <!-- slot:content -->
  </div>
</div>
<!-- card:end -->

<!-- nav:start brand="Brand" -->
<nav class="border-b border-zinc-200 bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">{{brand}}</span>
    <div class="flex items-center gap-4">
      <!-- slot:links -->
    </div>
  </div>
</nav>
<!-- nav:end -->

<!-- empty:start title="No items yet" message="Get started by creating your first item." -->
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
    <!-- slot:icon -->
  </div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">{{title}}</h3>
  <p class="text-sm text-zinc-600 mb-4">{{message}}</p>
  <!-- slot:action -->
</div>
<!-- empty:end -->

<!-- field:start label="Label" -->
<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">{{label}}</label>
  <!-- slot:input -->
  <p class="text-sm text-zinc-400">Helper text</p>
</div>
<!-- field:end -->

<!-- row:start name="John Doe" detail="john@example.com" -->
<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
  <div>
    <p class="text-sm font-medium text-zinc-900">{{name}}</p>
    <p class="text-sm text-zinc-500">{{detail}}</p>
  </div>
  <!-- slot:trailing -->
</div>
<!-- row:end -->

<!-- badge:start label="Status" variant=default -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">{{label}}</span>
<!-- badge:end -->

<!-- avatar:start initials="SM" size=md -->
<div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">{{initials}}</div>
<!-- avatar:end -->
`;

const DEFAULT_LAYOUT_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/lib/tailwind.js"></script>
  <script src="/lib/lucide.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  {{content}}
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>
`;

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
	.version("0.0.6")
	.option("-p, --port <number>", "port number (default: 4321)")
	.option("-d, --dir <path>", "design directory (default: .draftboard)")
	.option("--open", "open browser on start")
	.action(async (opts) => {
		const cwd = process.cwd();

		// Resolve design directory
		const designDirName =
			opts.dir ?? process.env.DRAFTBOARD_DIR ?? ".draftboard";
		process.env.DRAFTBOARD_DIR = designDirName;

		// Scaffold design directory
		const designDir = join(cwd, designDirName);
		const screensDir = join(designDir, "screens");

		for (const d of [designDir, screensDir]) {
			if (!existsSync(d)) mkdirSync(d, { recursive: true });
		}

		const defaults: Record<string, string> = {
			"design.md": DEFAULT_DESIGN_MD,
			"components.html": DEFAULT_COMPONENTS_HTML,
			"layout.html": DEFAULT_LAYOUT_HTML,
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
