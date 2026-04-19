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
	isProjectInitialized,
	getDesignMd,
	writeDesignMd,
	writeLayoutHtml,
	renameScreenWithLinks,
	getScreenFilePath,
} from "../fs";
import { parseMarkers, replaceMarkerOccurrence } from "../markers";
import {
	validateScreen,
	validateAllScreens,
	findScreensUsing,
	findScreensLinkingTo,
} from "../screen-validator";
import { writeFileSync } from "node:fs";
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
			if (isProjectInitialized()) {
				return {
					content: [
						{
							type: "text",
							text: "Project already initialized. No files were created or overwritten.",
						},
					],
				};
			}
			const result = scaffoldDesignDir();
			const createdList = result.created.length > 0 ? result.created.join(", ") : "nothing (defaults already present)";
			return {
				content: [
					{
						type: "text",
						text: `Project initialized. Created: ${createdList}.`,
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
			const markerCheck = parseMarkers(html);
			if (markerCheck.isErr()) {
				return {
					content: [
						{ type: "text", text: `Marker error: ${markerCheck.match({ ok: () => "", err: (e) => e.message })}` },
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
				const partialCheck = parseMarkers(newContent);
				if (partialCheck.isErr()) {
					return {
						content: [
							{ type: "text", text: `Marker error: ${partialCheck.match({ ok: () => "", err: (e) => e.message })}` },
						],
						isError: true,
					};
				}
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
			const fullCheck = parseMarkers(html);
			if (fullCheck.isErr()) {
				return {
					content: [
						{ type: "text", text: `Marker error: ${fullCheck.match({ ok: () => "", err: (e) => e.message })}` },
					],
					isError: true,
				};
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
				props: c.props,
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
			const label = component.variant
				? `${component.name}:${component.variant}`
				: component.name;
			const propsLine = component.props.length > 0 ? `\nProps: ${component.props.join(", ")}` : "";
			const slotsLine = component.slots.length > 0 ? `\nSlots: ${component.slots.join(", ")}` : "";
			const result = `Component: ${label}${propsLine}${slotsLine}\n\nHTML:\n${component.html}`;
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
				"Register or replace a reusable component. Pass only the inner HTML — never write start/end markers yourself; the server adds them. Use {{prop_name}} placeholders for text props (declare each in props) and <!-- slot:name --> markers for content slots (declare each in slots). Do not pass full HTML documents.\n\nGood example:\nupsert_component({\n  name: \"info-card\",\n  props: [\"title\", \"body\", \"icon\"],\n  html: '<div class=\"...\">\\n  <i data-lucide=\"{{icon}}\"></i>\\n  <p>{{title}}</p>\\n  <p>{{body}}</p>\\n</div>'\n})",
			inputSchema: {
				name: z
					.string()
					.describe("Kebab-case identifier (e.g. \"button\", \"info-card\")."),
				variant: z
					.string()
					.optional()
					.describe("Optional variant key (e.g. \"primary\", \"secondary\")."),
				props: z
					.array(z.string())
					.optional()
					.describe(
						"Declared text-prop names referenced via {{name}} in html. Every {{name}} in html must appear here.",
					),
				slots: z
					.array(z.string())
					.optional()
					.describe(
						"Declared slot names referenced via <!-- slot:name --> in html. Every slot marker in html must appear here.",
					),
				html: z
					.string()
					.describe(
						"INNER html only — a component fragment. Do NOT include <!-- name:start --> / <!-- name:end --> markers (server adds them) or full-document tags (<html>, <head>, <body>, <script>).",
					),
			},
		},
		tracked("upsert_component", ({ name, html, variant, props, slots }) => {
			const propsArr = Array.isArray(props) ? (props as string[]) : [];
			const slotsArr = Array.isArray(slots) ? (slots as string[]) : [];
			return upsertComponent({
				name: name as string,
				html: html as string,
				variant: variant as string | undefined,
				props: propsArr,
				slots: slotsArr,
			}).match({
				ok: ({ created, warnings }) => {
					const label = variant ? `${name}:${variant}` : name;
					const warnText =
						warnings.length > 0 ? `\nWarnings:\n- ${warnings.join("\n- ")}` : "";
					return {
						content: [
							{
								type: "text" as const,
								text: `Component "${label}" ${created ? "created" : "replaced"}.${warnText}`,
							},
						],
					};
				},
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

	server.registerTool(
		"list_markers_in_screen",
		{
			title: "List Markers In Screen",
			description:
				"Returns every component marker in the screen in source order, with parsed props and line ranges.",
			inputSchema: {
				name: z.string().describe("Screen name (kebab-case)"),
			},
		},
		tracked("list_markers_in_screen", ({ name }) => {
			const screen = getScreen(name);
			if (!screen) {
				return {
					content: [{ type: "text" as const, text: `Screen "${name}" not found.` }],
					isError: true,
				};
			}
			return parseMarkers(screen.html).match({
				ok: (markers) => ({
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								markers.map((m) => ({
									name: m.name,
									props: m.props,
									start_line: m.startLine,
									end_line: m.endLine,
								})),
								null,
								2,
							),
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
		"replace_component_in_screen",
		{
			title: "Replace Component In Screen",
			description:
				"Surgically replaces the inner HTML of a marker block inside a screen without rewriting the whole file. Preserves the start/end tags. Use list_markers_in_screen first to discover targets.",
			inputSchema: {
				screen_name: z.string().describe("Screen name (kebab-case)"),
				marker_name: z.string().describe("Marker name (e.g. button, card)"),
				occurrence: z
					.union([z.number().int(), z.literal("all")])
					.optional()
					.describe(
						"0-indexed occurrence; negative indexes from the end; 'all' replaces every occurrence. Default: 0.",
					),
				html: z.string().describe("New inner HTML to place between the markers."),
			},
		},
		tracked("replace_component_in_screen", ({ screen_name, marker_name, occurrence, html }) => {
			const screen = getScreen(screen_name);
			if (!screen) {
				return {
					content: [
						{ type: "text" as const, text: `Screen "${screen_name}" not found.` },
					],
					isError: true,
				};
			}
			const occ = occurrence ?? 0;
			return replaceMarkerOccurrence({
				content: screen.html,
				name: marker_name,
				occurrence: occ,
				html,
			}).match({
				ok: ({ content, replaced }) => {
					try {
						writeFileSync(getScreenFilePath(screen_name), content);
					} catch (e) {
						return {
							content: [
								{
									type: "text" as const,
									text: e instanceof Error ? e.message : String(e),
								},
							],
							isError: true,
						};
					}
					return {
						content: [
							{
								type: "text" as const,
								text: `Replaced ${replaced} "${marker_name}" marker(s) in "${screen_name}".`,
							},
						],
					};
				},
				err: (e) => ({
					content: [{ type: "text" as const, text: e.message }],
					isError: true,
				}),
			});
		}),
	);

	server.registerTool(
		"validate_screen",
		{
			title: "Validate Screen",
			description:
				"Lints a screen against current conventions: off-palette colors, bare component tags missing markers, unknown marker names, malformed markers, and dead links to non-existent screens.",
			inputSchema: {
				name: z.string().describe("Screen name (kebab-case)"),
			},
		},
		tracked("validate_screen", ({ name }) => {
			const { issues } = validateScreen({ screenName: name });
			return {
				content: [{ type: "text", text: JSON.stringify({ issues }, null, 2) }],
			};
		}),
	);

	server.registerTool(
		"validate_all_screens",
		{
			title: "Validate All Screens",
			description:
				"Runs validate_screen across every screen. Useful after updating design.md or components.html to find stale screens.",
			inputSchema: {},
		},
		tracked("validate_all_screens", () => {
			const result = validateAllScreens();
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		}),
	);

	server.registerTool(
		"find_screens_using",
		{
			title: "Find Screens Using",
			description:
				"Returns every screen that contains at least one marker with the given name. Use before editing or deleting a component to understand blast radius.",
			inputSchema: {
				marker_name: z.string().describe("Marker/component name to search for"),
			},
		},
		tracked("find_screens_using", ({ marker_name }) => {
			const hits = findScreensUsing({ markerName: marker_name });
			return {
				content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
			};
		}),
	);

	server.registerTool(
		"find_screens_linking_to",
		{
			title: "Find Screens Linking To",
			description:
				"Returns every screen containing an <a href> that points to the given screen (either bare name or /p/name). Use before renaming or deleting.",
			inputSchema: {
				screen_name: z.string().describe("Target screen name"),
			},
		},
		tracked("find_screens_linking_to", ({ screen_name }) => {
			const hits = findScreensLinkingTo({ screenName: screen_name });
			return {
				content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
			};
		}),
	);

	server.registerTool(
		"rename_screen",
		{
			title: "Rename Screen",
			description:
				"Renames a screen file. When update_links is true (default), also rewrites <a href> references in other screens so cross-screen links stay intact.",
			inputSchema: {
				from: z.string().describe("Current screen name"),
				to: z.string().describe("New screen name"),
				update_links: z
					.boolean()
					.optional()
					.describe("Rewrite links in other screens. Default: true."),
			},
		},
		tracked("rename_screen", ({ from, to, update_links }) => {
			return renameScreenWithLinks({
				from,
				to,
				updateLinks: update_links ?? true,
			}).match({
				ok: (result) => ({
					content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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
