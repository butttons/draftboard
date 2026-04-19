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
} from "./fs";
import { validateScreenName } from "./validation";
import { recordActivity, type McpAction } from "./mcp-activity";
import { listComponents, getComponent } from "./components";

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
        "Initialize the .pi/design directory with default design.md, components.html, and layout.html. Call this once before using other tools if the project is new.",
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
        html: z.string().describe("The HTML content, composed from components in get_conventions"),
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
        html: z.string().describe("The HTML content, composed from components in get_conventions"),
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
      const componentList = components.map((c) => {
        const variant = c.variant ? `:${c.variant}` : "";
        const props = Object.keys(c.props).filter((k) => k !== "variant").join(", ");
        const slots = c.slots.join(", ");
        let desc = `- **${c.name}**${variant}`;
        if (props) desc += ` (props: ${props})`;
        if (slots) desc += ` (slots: ${slots})`;
        return desc;
      }).join("\n");
      const response = `## HOW TO BUILD SCREENS

1. Use the components from the COMPONENTS section below.
2. WRAP each component with markers for easy identification:
   \`<!-- name:start props --> ... <!-- name:end -->\`
3. Follow the DESIGN CONVENTIONS for spacing, colors, and typography.

## MARKER FORMAT (REQUIRED)

Every component in your screen MUST be wrapped with markers:

\`\`\`html
<!-- button:start label="Save" variant=primary -->
<button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Save</button>
<!-- button:end -->

<!-- card:start -->
<div class="border border-zinc-200 rounded bg-white overflow-hidden">
  ...
</div>
<!-- card:end -->
\`\`\`

This allows the AI to find and update specific components later using update_screen with start/end lines.

## LINKING BETWEEN SCREENS

Use relative paths to link between screens:
\`<a href="other-screen-name">Go to other screen</a>\`

From \`/p/profile\`, this links to \`/p/other-screen-name\`. Use list_screens to see existing screens.

## AVAILABLE COMPONENTS

${componentList}

Use list_components and get_component(name) for full HTML snippets.

---

${conventions}`;
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
        content: [{
          type: "text",
          text: JSON.stringify(summary, null, 2),
        }],
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
        name: z.string().describe("Component name: button, input, card, empty, row, badge, avatar, field, nav"),
        variant: z.string().optional().describe("Variant if applicable (e.g., primary, secondary, success, sm, lg)"),
      },
    },
    tracked("get_component", ({ name, variant }) => {
      const component = getComponent(name, variant);
      if (!component) {
        const available = listComponents()
          .map((c) => (c.variant ? `${c.name}:${c.variant}` : c.name))
          .join(", ");
        return {
          content: [{
            type: "text",
            text: `Component "${name}"${variant ? ` with variant "${variant}"` : ""} not found. Available: ${available}`,
          }],
          isError: true,
        };
      }
      const props = Object.entries(component.props)
        .filter(([k]) => k !== "variant")
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      const slots = component.slots.length > 0
        ? `\nSlots to fill: ${component.slots.join(", ")}`
        : "";
      const result = `<!-- ${component.name}${component.variant ? `:${component.variant}` : ""} ${props} -->\n${component.html}${slots}`;
      return {
        content: [{ type: "text", text: result }],
      };
    }),
  );

  return server;
}
