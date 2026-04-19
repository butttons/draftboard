#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";
import { DEFAULT_DESIGN_MD, DEFAULT_COMPONENTS_HTML, DEFAULT_LAYOUT_HTML } from "../src/server/defaults";

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
