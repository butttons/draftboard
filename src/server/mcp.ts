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

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "@butttons/design",
    version: "1.0.0",
  });

  server.registerTool(
    "init_project",
    {
      title: "Init Project",
      description: "Initialize the .pi/design directory with default design.md, components.html, and layout.html. Call this once before using other tools if the project is new.",
      inputSchema: {},
    },
    () => {
      scaffoldDesignDir();
      return {
        content: [{ type: "text", text: "Project initialized. Default design.md, components.html, and layout.html created." }],
      };
    },
  );

  server.registerTool(
    "list_screens",
    {
      title: "List Screens",
      description: "List all wireframe screens with their names, paths, and last updated timestamps.",
      inputSchema: {},
    },
    () => {
      const screens = listScreens();
      return {
        content: [{ type: "text", text: JSON.stringify(screens) }],
      };
    },
  );

  server.registerTool(
    "get_screen",
    {
      title: "Get Screen",
      description: "Get the HTML content of a screen. Optionally specify start and end lines to read only a portion of the file.",
      inputSchema: {
        name: z.string().describe("The screen name (kebab-case)"),
        start: z.number().int().min(1).optional().describe("Start line number (1-indexed, inclusive). If omitted, reads from beginning."),
        end: z.number().int().min(1).optional().describe("End line number (1-indexed, inclusive). If omitted, reads to end."),
      },
    },
    ({ name, start, end }) => {
      if (start !== undefined || end !== undefined) {
        const screen = getScreen(name);
        if (!screen) {
          return { content: [{ type: "text", text: `Screen "${name}" not found.` }], isError: true };
        }
        const lines = screen.html.split("\n");
        const total = lines.length;
        const s = start ?? 1;
        const e = end ?? total;
        const sliced = lines.slice(s - 1, e);
        return { content: [{ type: "text", text: JSON.stringify({ name, lines: sliced, start: s, end: Math.min(e, total), total }) }] };
      }
      const screen = getScreen(name);
      if (!screen) {
        return { content: [{ type: "text", text: `Screen "${name}" not found.` }], isError: true };
      }
      return { content: [{ type: "text", text: JSON.stringify(screen) }] };
    },
  );

  server.registerTool(
    "create_screen",
    {
      title: "Create Screen",
      description: "Create a new wireframe screen with the given name and HTML content. Errors if the screen already exists.",
      inputSchema: {
        name: z.string().describe("The screen name (kebab-case)"),
        html: z.string().describe("The HTML content for the screen"),
      },
    },
    ({ name, html }) => {
      if (!validateScreenName(name)) {
        return { content: [{ type: "text", text: "Invalid screen name. Use kebab-case, no path separators." }], isError: true };
      }
      return createScreen(name, html).match({
        ok: () => ({ content: [{ type: "text" as const, text: `Screen "${name}" created.` }] }),
        err: (e) => ({ content: [{ type: "text" as const, text: e.message }], isError: true }),
      });
    },
  );

  server.registerTool(
    "update_screen",
    {
      title: "Update Screen",
      description: "Update a screen's HTML. If start and end are provided, only those lines are replaced. Otherwise, the entire file is overwritten.",
      inputSchema: {
        name: z.string().describe("The screen name (kebab-case)"),
        html: z.string().describe("The HTML content"),
        start: z.number().int().min(1).optional().describe("Start line to replace (1-indexed, inclusive). Required for partial edits."),
        end: z.number().int().min(1).optional().describe("End line to replace (1-indexed, inclusive). Required for partial edits."),
      },
    },
    ({ name, html, start, end }) => {
      if (start !== undefined || end !== undefined) {
        const screen = getScreen(name);
        if (!screen) {
          return { content: [{ type: "text", text: `Screen "${name}" not found.` }], isError: true };
        }
        const lines = screen.html.split("\n");
        const total = lines.length;
        const s = start ?? 1;
        const e = end ?? total;
        if (s < 1) return { content: [{ type: "text", text: "Start line must be >= 1." }], isError: true };
        if (e < s) return { content: [{ type: "text", text: "End line must be >= start." }], isError: true };
        if (s > total) return { content: [{ type: "text", text: `Start line ${s} exceeds file length (${total}).` }], isError: true };
        const clampedEnd = Math.min(e, total);
        const before = lines.slice(0, s - 1);
        const after = lines.slice(clampedEnd);
        const newContent = [...before, ...html.split("\n"), ...after].join("\n");
        return updateScreen(name, newContent).match({
          ok: () => ({ content: [{ type: "text" as const, text: `Lines ${s}-${clampedEnd} updated in "${name}".` }] }),
          err: (err) => ({ content: [{ type: "text" as const, text: err.message }], isError: true }),
        });
      }
      return updateScreen(name, html).match({
        ok: () => ({ content: [{ type: "text" as const, text: `Screen "${name}" updated.` }] }),
        err: (e) => ({ content: [{ type: "text" as const, text: e.message }], isError: true }),
      });
    },
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
    ({ name }) => {
      return deleteScreen(name).match({
        ok: () => ({ content: [{ type: "text" as const, text: `Screen "${name}" deleted.` }] }),
        err: (e) => ({ content: [{ type: "text" as const, text: e.message }], isError: true }),
      });
    },
  );

  server.registerTool(
    "get_conventions",
    {
      title: "Get Conventions",
      description: "Get the design conventions (design.md) and canonical components (components.html) concatenated. Call this before generating screens to understand the project's design system.",
      inputSchema: {},
    },
    () => {
      return {
        content: [{ type: "text", text: getConventions() }],
      };
    },
  );

  return server;
}
