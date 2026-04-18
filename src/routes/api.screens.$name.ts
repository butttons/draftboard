import { createFileRoute } from "@tanstack/react-router";
import { getScreen, updateScreen, deleteScreen, renameScreen, validateScreenName } from "#/server/fs";

export const Route = createFileRoute("/api/screens/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const screen = getScreen(params.name);
        if (!screen) {
          return Response.json({ error: "Screen not found" }, { status: 404 });
        }
        return Response.json(screen);
      },
      PUT: async ({ request, params }) => {
        const body = await request.json();

        // Handle rename
        if ("newName" in body) {
          const { newName } = body as { newName: string };
          if (!validateScreenName(newName)) {
            return Response.json(
              { error: "Invalid screen name. Use kebab-case." },
              { status: 400 },
            );
          }
          try {
            renameScreen(params.name, newName);
            return Response.json({ success: true, name: newName });
          } catch (err) {
            return Response.json(
              { error: (err as Error).message },
              { status: 400 },
            );
          }
        }

        // Handle content update
        const { html } = body as { html: string };
        try {
          updateScreen(params.name, html);
          return Response.json({ success: true });
        } catch (err) {
          return Response.json(
            { error: (err as Error).message },
            { status: 400 },
          );
        }
      },
      DELETE: async ({ params }) => {
        try {
          deleteScreen(params.name);
          return Response.json({ success: true });
        } catch (err) {
          return Response.json(
            { error: (err as Error).message },
            { status: 400 },
          );
        }
      },
    },
  },
});
