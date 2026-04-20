import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";
import packageJson from "../package.json";

// Available at runtime after esbuild CJS compilation
declare const __dirname: string;


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
	.version(packageJson.version)
	.option("-p, --port <number>", "port number (default: 4321)")
	.option("-d, --dir <path>", "design directory (default: .draftboard)")
	.option("--open", "open browser on start")
	.action(async (opts) => {
		const cwd = process.cwd();

		// Resolve design directory
		const designDirName =
			opts.dir ?? process.env.DRAFTBOARD_DIR ?? ".draftboard";
		process.env.DRAFTBOARD_DIR = designDirName;

		// Ensure design directory exists (does NOT scaffold default files —
		// that is exclusively the job of the `init_project` MCP tool).
		const designDir = join(cwd, designDirName);
		const screensDir = join(designDir, "screens");
		for (const dir of [designDir, screensDir]) {
			if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
  { "mcpServers": { "draftboard": { "url": "http://localhost:${port}/mcp" } } }
`);

		if (opts.open) {
			const url = `http://localhost:${port}`;
			execSync(
				process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`,
			);
		}

		// Start server
		await import(
			join(__dirname, "..", ".output", "server", "index.mjs")
		);
	});

program.parse();
