import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import {
  listScreens,
  getScreen,
  createScreen,
  updateScreen,
  deleteScreen,
  getConventions,
  validateScreenName,
} from "./fs";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "pi-design",
    version: "1.0.0",
  });

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
      description: "Get the HTML content of a specific screen by name.",
      inputSchema: {
        name: z.string().describe("The screen name (kebab-case)"),
      },
    },
    ({ name }) => {
      const screen = getScreen(name);
      if (!screen) {
        return {
          content: [{ type: "text", text: `Screen "${name}" not found.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(screen) }],
      };
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
        return {
          content: [{ type: "text", text: "Invalid screen name. Use kebab-case, no path separators." }],
          isError: true,
        };
      }
      try {
        createScreen(name, html);
        return {
          content: [{ type: "text", text: `Screen "${name}" created.` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: (err as Error).message }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_screen",
    {
      title: "Update Screen",
      description: "Overwrite the HTML content of an existing screen.",
      inputSchema: {
        name: z.string().describe("The screen name (kebab-case)"),
        html: z.string().describe("The new HTML content"),
      },
    },
    ({ name, html }) => {
      try {
        updateScreen(name, html);
        return {
          content: [{ type: "text", text: `Screen "${name}" updated.` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: (err as Error).message }],
          isError: true,
        };
      }
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
      try {
        deleteScreen(name);
        return {
          content: [{ type: "text", text: `Screen "${name}" deleted.` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: (err as Error).message }],
          isError: true,
        };
      }
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
