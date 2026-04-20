/**
 * Draftboard Extension for pi
 *
 * Registers all draftboard MCP tools so the LLM can create and edit
 * wireframes directly. Detects .draftboard/ projects and connects
 * to the running MCP server automatically.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// -- MCP endpoint discovery --

function findMcpUrl(cwd: string): string | null {
	const portFile = join(cwd, ".draftboard", ".port");
	if (!existsSync(portFile)) return null;
	try {
		return readFileSync(portFile, "utf-8").trim();
	} catch {
		return null;
	}
}

// -- MCP call helper --

type McpToolResult = {
	content: Array<{ type: string; text: string }>;
	isError?: boolean;
};

async function callMcpTool(
	mcpUrl: string,
	name: string,
	args: Record<string, unknown>,
): Promise<McpToolResult> {
	const res = await fetch(mcpUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: { name, arguments: args },
		}),
	});

	if (!res.ok) {
		throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
	}

	const text = await res.text();

	// Response is SSE-formatted: "event: message\ndata: {...}\n\n"
	const dataMatch = text.match(/data: (.+)/);
	if (!dataMatch?.[1]) {
		throw new Error("Invalid MCP response format");
	}

	const parsed = JSON.parse(dataMatch[1]);
	if (parsed.error) {
		throw new Error(`MCP error: ${parsed.error.message}`);
	}

	return parsed.result as McpToolResult;
}

// -- Tool definitions --

type ToolDef = {
	name: string;
	label: string;
	description: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- typebox schema
	schema: any;
};

const TOOLS: ToolDef[] = [
	{
		name: "draftboard_init_project",
		label: "Draftboard: Init Project",
		description:
			"Initialize the design directory with default design.md, components.html, and layout.html. Call this once before using other tools if the project is new.",
		schema: Type.Object({}),
	},
	{
		name: "draftboard_list_screens",
		label: "Draftboard: List Screens",
		description: "List all wireframe screens with their names, paths, and last updated timestamps.",
		schema: Type.Object({}),
	},
	{
		name: "draftboard_get_screen",
		label: "Draftboard: Get Screen",
		description:
			"Get the HTML content of a screen. Optionally specify start and end lines to read only a portion.",
		schema: Type.Object({
			name: Type.String({ description: "Screen name (kebab-case)" }),
			start: Type.Optional(Type.Number({ description: "Start line (1-indexed, inclusive)" })),
			end: Type.Optional(Type.Number({ description: "End line (1-indexed, inclusive)" })),
		}),
	},
	{
		name: "draftboard_create_screen",
		label: "Draftboard: Create Screen",
		description:
			"Create a new wireframe screen. IMPORTANT: Call draftboard_get_conventions first to get design rules and reusable component blocks.",
		schema: Type.Object({
			name: Type.String({ description: "Screen name (kebab-case)" }),
			html: Type.String({ description: "HTML content, composed from components" }),
		}),
	},
	{
		name: "draftboard_update_screen",
		label: "Draftboard: Update Screen",
		description:
			"Update a screen's HTML. If start and end are provided, only those lines are replaced. Otherwise the entire file is overwritten.",
		schema: Type.Object({
			name: Type.String({ description: "Screen name (kebab-case)" }),
			html: Type.String({ description: "HTML content" }),
			start: Type.Optional(Type.Number({ description: "Start line to replace (1-indexed)" })),
			end: Type.Optional(Type.Number({ description: "End line to replace (1-indexed)" })),
		}),
	},
	{
		name: "draftboard_delete_screen",
		label: "Draftboard: Delete Screen",
		description: "Delete a wireframe screen by name.",
		schema: Type.Object({
			name: Type.String({ description: "Screen name (kebab-case)" }),
		}),
	},
	{
		name: "draftboard_rename_screen",
		label: "Draftboard: Rename Screen",
		description:
			"Renames a screen file. When update_links is true (default), also rewrites href references in other screens.",
		schema: Type.Object({
			from: Type.String({ description: "Current screen name" }),
			to: Type.String({ description: "New screen name" }),
			update_links: Type.Optional(Type.Boolean({ description: "Rewrite links in other screens (default: true)" })),
		}),
	},
	{
		name: "draftboard_get_conventions",
		label: "Draftboard: Get Conventions",
		description:
			"REQUIRED before creating or updating screens. Returns design rules and reusable component blocks. Always call this first.",
		schema: Type.Object({}),
	},
	{
		name: "draftboard_list_components",
		label: "Draftboard: List Components",
		description: "List all available UI components with their names, variants, props, and slots.",
		schema: Type.Object({}),
	},
	{
		name: "draftboard_get_component",
		label: "Draftboard: Get Component",
		description:
			"Get the HTML snippet for a component with {{prop}} placeholders and slot markers.",
		schema: Type.Object({
			name: Type.String({ description: "Component name (e.g. button, input, card)" }),
			variant: Type.Optional(Type.String({ description: "Variant (e.g. primary, secondary)" })),
		}),
	},
	{
		name: "draftboard_get_design_doc",
		label: "Draftboard: Get Design Doc",
		description: "Returns the raw contents of design.md for editing.",
		schema: Type.Object({}),
	},
	{
		name: "draftboard_update_design_doc",
		label: "Draftboard: Update Design Doc",
		description: "Full-file replace of design.md. This affects every future screen generation.",
		schema: Type.Object({
			content: Type.String({ description: "The full new markdown contents of design.md" }),
		}),
	},
	{
		name: "draftboard_update_layout",
		label: "Draftboard: Update Layout",
		description: "Full-file replace of layout.html, the wrapper template used around every screen preview.",
		schema: Type.Object({
			content: Type.String({ description: "The full new HTML contents of layout.html" }),
		}),
	},
	{
		name: "draftboard_upsert_component",
		label: "Draftboard: Upsert Component",
		description:
			"Register or replace a reusable component. Pass inner HTML only with {{prop}} placeholders and <!-- slot:name --> markers.",
		schema: Type.Object({
			name: Type.String({ description: "Kebab-case identifier" }),
			html: Type.String({ description: "Inner HTML fragment" }),
			variant: Type.Optional(Type.String({ description: "Variant key" })),
			props: Type.Optional(Type.Array(Type.String(), { description: "Prop names referenced via {{name}}" })),
			slots: Type.Optional(Type.Array(Type.String(), { description: "Slot names referenced via <!-- slot:name -->" })),
		}),
	},
	{
		name: "draftboard_delete_component",
		label: "Draftboard: Delete Component",
		description: "Remove a component block from components.html.",
		schema: Type.Object({
			name: Type.String({ description: "Component name" }),
			variant: Type.Optional(Type.String({ description: "Variant to delete" })),
		}),
	},
	{
		name: "draftboard_list_markers_in_screen",
		label: "Draftboard: List Markers",
		description: "Returns every component marker in a screen in source order with parsed props and line ranges.",
		schema: Type.Object({
			name: Type.String({ description: "Screen name (kebab-case)" }),
		}),
	},
	{
		name: "draftboard_replace_component_in_screen",
		label: "Draftboard: Replace Marker",
		description:
			"Surgically replaces the inner HTML of a marker block inside a screen. Preserves start/end tags.",
		schema: Type.Object({
			screen_name: Type.String({ description: "Screen name" }),
			marker_name: Type.String({ description: "Marker/component name" }),
			html: Type.String({ description: "New inner HTML" }),
			occurrence: Type.Optional(
				Type.Union([Type.Number(), Type.Literal("all")], {
					description: "0-indexed occurrence, negative from end, or 'all' (default: 0)",
				}),
			),
		}),
	},
	{
		name: "draftboard_validate_screen",
		label: "Draftboard: Validate Screen",
		description: "Lints a screen against conventions: off-palette colors, bare tags, unknown markers, dead links.",
		schema: Type.Object({
			name: Type.String({ description: "Screen name" }),
		}),
	},
	{
		name: "draftboard_validate_all_screens",
		label: "Draftboard: Validate All Screens",
		description: "Runs validate_screen across every screen.",
		schema: Type.Object({}),
	},
	{
		name: "draftboard_find_screens_using",
		label: "Draftboard: Find Usages",
		description: "Returns every screen that contains at least one marker with the given name.",
		schema: Type.Object({
			marker_name: Type.String({ description: "Marker/component name to search for" }),
		}),
	},
	{
		name: "draftboard_find_screens_linking_to",
		label: "Draftboard: Find Links",
		description: "Returns every screen containing an href that points to the given screen.",
		schema: Type.Object({
			screen_name: Type.String({ description: "Target screen name" }),
		}),
	},
];

// -- MCP tool name mapping --

function toMcpToolName(piToolName: string): string {
	return piToolName.replace(/^draftboard_/, "");
}

// -- Extension --

export default function draftboardExtension(pi: ExtensionAPI): void {
	let mcpUrl: string | null = null;
	let registered = false;

	function registerTools(ctx: ExtensionContext): void {
		if (registered) return;
		if (!mcpUrl) return;

		registered = true;

		for (const tool of TOOLS) {
			pi.registerTool({
				name: tool.name,
				label: tool.label,
				description: tool.description,
				parameters: tool.schema,

				async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
					if (!mcpUrl) {
						throw new Error("Draftboard MCP not connected");
					}

					const mcpName = toMcpToolName(tool.name);
					const result = await callMcpTool(
						mcpUrl,
						mcpName,
						params as Record<string, unknown>,
					);

					// Extract text content
					const textParts = result.content
						.filter((c) => c.type === "text")
						.map((c) => c.text);

					return {
						content: result.content,
						details: {
							tool: mcpName,
							textPreview: textParts[0]?.slice(0, 200),
						},
						isError: result.isError,
					};
				},
			});
		}

		ctx.ui.setStatus(
			"draftboard",
			ctx.ui.theme.fg("success", "draftboard ") +
				ctx.ui.theme.fg("dim", "connected"),
		);
	}

	pi.on("session_start", async (_event, ctx) => {
		mcpUrl = findMcpUrl(ctx.cwd);

		if (!mcpUrl) {
			ctx.ui.setStatus("draftboard", undefined);
			return;
		}

		registerTools(ctx);
	});

	pi.registerCommand("draftboard", {
		description: "Show draftboard connection status",
		handler: async (_args, ctx) => {
			if (!mcpUrl) {
				mcpUrl = findMcpUrl(ctx.cwd);
			}

			if (!mcpUrl) {
				ctx.ui.notify("Draftboard not detected. Start draftboard in this project.", "warning");
				return;
			}

			if (!registered) {
				registerTools(ctx);
			}

			ctx.ui.notify(`Draftboard connected: ${mcpUrl}`, "info");

			// Fetch and show screens
			try {
				const result = await callMcpTool(mcpUrl, "list_screens", {});
				const text = result.content[0]?.text ?? "[]";
				const screens = JSON.parse(text) as Array<{ name: string }>;
				const lines = screens.map((s) => `  ${s.name}`);
				ctx.ui.setWidget(
					"draftboard",
					[
						ctx.ui.theme.fg("accent", "Draftboard Screens"),
						...lines.map((l) => ctx.ui.theme.fg("muted", l)),
					],
				);
			} catch (err) {
				ctx.ui.notify(`Failed to list screens: ${err}`, "error");
			}
		},
	});

	// Refresh after draftboard tool calls
	pi.on("tool_result", async (event, ctx) => {
		if (!event.toolName.startsWith("draftboard_")) return;
		if (!mcpUrl) return;

		// Update screen count in status
		try {
			const result = await callMcpTool(mcpUrl, "list_screens", {});
			const screens = JSON.parse(result.content[0]?.text ?? "[]") as unknown[];
			ctx.ui.setStatus(
				"draftboard",
				ctx.ui.theme.fg("success", "draftboard ") +
					ctx.ui.theme.fg("dim", `${screens.length} screens`),
			);
		} catch {
			// ignore
		}
	});
}
