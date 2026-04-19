import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import {
	listScreens,
	getScreen,
	createScreen,
	updateScreen,
	deleteScreen,
	getConventions,
	scaffoldDesignDir,
	getDesignMd,
	writeDesignMd,
	writeLayoutHtml,
} from "../fs";
import { validateScreenName } from "../validation";
import { recordActivity, type McpAction } from "./activity";
import {
	listComponents,
	getComponent,
	upsertComponent,
	deleteComponent,
} from "../components";
import { buildConventionsResponse } from "./templates";

type ToolArgs = Record<string, unknown>;

function tracked<TArgs extends ToolArgs, R>(
	action: McpAction,
	fn: (args: TArgs) => R,
): (args: TArgs) => R {
	return (args: TArgs): R => {
		const start = Date.now();
		const result = fn(args);
		const duration = Date.now() - start;
		const screenName = typeof args.name === "string" ? args.name : undefined;
		recordActivity(action, screenName, duration);
		return result;
	};
}

export function createMcpServer(): McpServer {
	const server = new McpServer({
		name: "@butttons/draftboard",
		version: "1.0.0",
	});

	server.registerTool(
		"init_project",
		{
			title: "Init Project",
			description:
				"Initialize the design directory with default design.md, components.html, and layout.html. Call this once before using other tools if the project is new.",
			inputSchema: {},
		},
		tracked("init_project", () => {
			scaffoldDesignDir();
			return {
				content: [
					{
						type: "text",
						text: "Project initialized. Default design.md, components.html, and layout.html created.",
					},
				],
			};
		}),
	);

	server.registerTool(
		"list_screens",
		{
			title: "List Screens",
			description:
				"List all wireframe screens with their names, paths, and last updated timestamps.",
			inputSchema: {},
		},
		tracked("list_screens", () => {
			const screens = listScreens();
			return {
				content: [{ type: "text", text: JSON.stringify(screens) }],
			};
		}),
	);

	server.registerTool(
		"get_screen",
		{
			title: "Get Screen",
			description:
				"Get the HTML content of a screen. Optionally specify start and end lines to read only a portion of the file.",
			inputSchema: {
				name: z.string().describe("The screen name (kebab-case)"),
				start: z
					.number()
					.int()
					.min(1)
					.optional()
					.describe(
						"Start line number (1-indexed, inclusive). If omitted, reads from beginning.",
					),
				end: z
					.number()
					.int()
					.min(1)
					.optional()
					.describe(
						"End line number (1-indexed, inclusive). If omitted, reads to end.",
					),
			},
		},
		tracked("get_screen", ({ name, start, end }) => {
			if (start !== undefined || end !== undefined) {
				const screen = getScreen(name);
				if (!screen) {
					return {
						content: [{ type: "text", text: `Screen "${name}" not found.` }],
						isError: true,
					};
				}
				const lines = screen.html.split("\n");
				const total = lines.length;
				const s = start ?? 1;
				const e = end ?? total;
				const sliced = lines.slice(s - 1, e);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								name,
								lines: sliced,
								start: s,
								end: Math.min(e, total),
								total,
							}),
						},
					],
				};
			}
			const screen = getScreen(name);
			if (!screen) {
				return {
					content: [{ type: "text", text: `Screen "${name}" not found.` }],
					isError: true,
				};
			}
			return { content: [{ type: "text", text: JSON.stringify(screen) }] };
		}),
	);

	server.registerTool(
		"create_screen",
		{
			title: "Create Screen",
			description:
				"Create a new wireframe screen. IMPORTANT: Call get_conventions first to get the design rules and reusable component blocks. Compose the HTML using those components, not raw HTML.",
			inputSchema: {
				name: z.string().describe("The screen name (kebab-case)"),
				html: z
					.string()
					.describe(
						"The HTML content, composed from components in get_conventions",
					),
			},
		},
		tracked("create_screen", ({ name, html }) => {
			if (!validateScreenName(name)) {
				return {
					content: [
						{
							type: "text",
							text: "Invalid screen name. Use kebab-case, no path separators.",
						},
					],
					isError: true,
				};
			}
			return createScreen(name, html).match({
				ok: () => ({
					content: [
						{ type: "text" as const, text: `Screen "${name}" created.` },
					],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"update_screen",
		{
			title: "Update Screen",
			description:
				"Update a screen's HTML. Call get_conventions first to get components and design rules. If start and end are provided, only those lines are replaced. Otherwise, the entire file is overwritten.",
			inputSchema: {
				name: z.string().describe("The screen name (kebab-case)"),
				html: z
					.string()
					.describe(
						"The HTML content, composed from components in get_conventions",
					),
				start: z
					.number()
					.int()
					.min(1)
					.optional()
					.describe(
						"Start line to replace (1-indexed, inclusive). Required for partial edits.",
					),
				end: z
					.number()
					.int()
					.min(1)
					.optional()
					.describe(
						"End line to replace (1-indexed, inclusive). Required for partial edits.",
					),
			},
		},
		tracked("update_screen", ({ name, html, start, end }) => {
			if (start !== undefined || end !== undefined) {
				const screen = getScreen(name);
				if (!screen) {
					return {
						content: [{ type: "text", text: `Screen "${name}" not found.` }],
						isError: true,
					};
				}
				const lines = screen.html.split("\n");
				const total = lines.length;
				const s = start ?? 1;
				const e = end ?? total;
				if (s < 1)
					return {
						content: [{ type: "text", text: "Start line must be >= 1." }],
						isError: true,
					};
				if (e < s)
					return {
						content: [{ type: "text", text: "End line must be >= start." }],
						isError: true,
					};
				if (s > total)
					return {
						content: [
							{
								type: "text",
								text: `Start line ${s} exceeds file length (${total}).`,
							},
						],
						isError: true,
					};
				const clampedEnd = Math.min(e, total);
				const before = lines.slice(0, s - 1);
				const after = lines.slice(clampedEnd);
				const newContent = [...before, ...html.split("\n"), ...after].join(
					"\n",
				);
				return updateScreen(name, newContent).match({
					ok: () => ({
						content: [
							{
								type: "text" as const,
								text: `Lines ${s}-${clampedEnd} updated in "${name}".`,
							},
						],
					}),
					err: (err) => ({
						content: [{ type: "text" as const, text: err.message }],
						isError: true,
					}),
				});
			}
			return updateScreen(name, html).match({
				ok: () => ({
					content: [
						{ type: "text" as const, text: `Screen "${name}" updated.` },
					],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"delete_screen",
		{
			title: "Delete Screen",
			description: "Delete a wireframe screen by name.",
			inputSchema: {
				name: z.string().describe("The screen name (kebab-case)"),
			},
		},
		tracked("delete_screen", ({ name }) => {
			return deleteScreen(name).match({
				ok: () => ({
					content: [
						{ type: "text" as const, text: `Screen "${name}" deleted.` },
					],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"get_conventions",
		{
			title: "Get Conventions",
			description:
				"REQUIRED before creating or updating screens. Returns design rules and reusable component blocks. Always call this first, then compose screens using the components listed.",
			inputSchema: {},
		},
		tracked("get_conventions", () => {
			const conventions = getConventions();
			const components = listComponents();
			const response = buildConventionsResponse(conventions, components);
			return {
				content: [{ type: "text", text: response }],
			};
		}),
	);

	server.registerTool(
		"list_components",
		{
			title: "List Components",
			description:
				"List all available UI components with their names, variants, props, and slots. Use get_component to get the HTML for a specific one.",
			inputSchema: {},
		},
		tracked("list_components", () => {
			const components = listComponents();
			const summary = components.map((c) => ({
				name: c.name,
				variant: c.variant,
				props: Object.keys(c.props).filter((k) => k !== "variant"),
				slots: c.slots,
			}));
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(summary, null, 2),
					},
				],
			};
		}),
	);

	server.registerTool(
		"get_component",
		{
			title: "Get Component",
			description:
				'Get the HTML snippet for a component. Returns the HTML with {{prop}} placeholders and <!-- slot:name --> markers. Replace {{prop}} values and fill slots with content.',
			inputSchema: {
				name: z
					.string()
					.describe(
						"Component name: button, input, card, empty, row, badge, avatar, field, nav",
					),
				variant: z
					.string()
					.optional()
					.describe(
						"Variant if applicable (e.g., primary, secondary, success, sm, lg)",
					),
			},
		},
		tracked("get_component", ({ name, variant }) => {
			const component = getComponent(name, variant);
			if (!component) {
				const available = listComponents()
					.map((c) => (c.variant ? `${c.name}:${c.variant}` : c.name))
					.join(", ");
				return {
					content: [
						{
							type: "text",
							text: `Component "${name}"${variant ? ` with variant "${variant}"` : ""} not found. Available: ${available}`,
						},
					],
					isError: true,
				};
			}
			const props = Object.entries(component.props)
				.filter(([k]) => k !== "variant")
				.map(([k, v]) => `${k}="${v}"`)
				.join(" ");
			const slots =
				component.slots.length > 0
					? `\nSlots to fill: ${component.slots.join(", ")}`
					: "";
			const result = `<!-- ${component.name}${component.variant ? `:${component.variant}` : ""} ${props} -->\n${component.html}${slots}`;
			return {
				content: [{ type: "text", text: result }],
			};
		}),
	);

	server.registerTool(
		"get_design_doc",
		{
			title: "Get Design Doc",
			description:
				"Returns the raw contents of design.md for editing. Use get_conventions when you want the formatted read-only bundle instead.",
			inputSchema: {},
		},
		tracked("get_design_doc", () => {
			const content = getDesignMd();
			return { content: [{ type: "text", text: content }] };
		}),
	);

	server.registerTool(
		"update_design_doc",
		{
			title: "Update Design Doc",
			description:
				"Full-file replace of design.md. This affects every future screen generation — be deliberate.",
			inputSchema: {
				content: z
					.string()
					.describe("The full new markdown contents of design.md"),
			},
		},
		tracked("update_design_doc", ({ content }) => {
			if (typeof content !== "string" || content.trim().length === 0) {
				return {
					content: [
						{ type: "text" as const, text: "design.md content must be non-empty." },
					],
					isError: true,
				};
			}
			return writeDesignMd(content).match({
				ok: () => ({
					content: [{ type: "text" as const, text: "design.md updated." }],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"update_layout",
		{
			title: "Update Layout",
			description:
				"Full-file replace of layout.html, the wrapper template used around every screen preview.",
			inputSchema: {
				content: z
					.string()
					.describe("The full new HTML contents of layout.html"),
			},
		},
		tracked("update_layout", ({ content }) => {
			if (typeof content !== "string" || content.trim().length === 0) {
				return {
					content: [
						{ type: "text" as const, text: "layout.html content must be non-empty." },
					],
					isError: true,
				};
			}
			return writeLayoutHtml(content).match({
				ok: () => ({
					content: [{ type: "text" as const, text: "layout.html updated." }],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"upsert_component",
		{
			title: "Upsert Component",
			description:
				"Create or replace a single component block in components.html. Keyed by name (and optional variant). Pass the inner HTML only — the start/end markers are generated for you.",
			inputSchema: {
				name: z
					.string()
					.describe("Component name (identifier, e.g. button, card, lifecycle-bar)"),
				html: z
					.string()
					.describe(
						"Inner HTML for the component. May use {{prop}} placeholders and <!-- slot:name --> markers.",
					),
				variant: z
					.string()
					.optional()
					.describe("Optional variant key (e.g. primary, secondary)"),
			},
		},
		tracked("upsert_component", ({ name, html, variant }) => {
			return upsertComponent({ name, html, variant }).match({
				ok: ({ created }) => ({
					content: [
						{
							type: "text" as const,
							text: `Component "${variant ? `${name}:${variant}` : name}" ${created ? "created" : "replaced"}.`,
						},
					],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"delete_component",
		{
			title: "Delete Component",
			description:
				"Remove a component block from components.html. If multiple variants share a name, pass variant to target a specific one.",
			inputSchema: {
				name: z.string().describe("Component name"),
				variant: z.string().optional().describe("Variant to delete, if any"),
			},
		},
		tracked("delete_component", ({ name, variant }) => {
			return deleteComponent({ name, variant }).match({
				ok: () => ({
					content: [
						{
							type: "text" as const,
							text: `Component "${variant ? `${name}:${variant}` : name}" deleted.`,
						},
					],
				}),
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	return server;
}
