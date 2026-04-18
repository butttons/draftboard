import { createFileRoute } from "@tanstack/react-router";
import { listScreens, createScreen, validateScreenName } from "#/server/fs";

export const Route = createFileRoute("/api/screens")({
  server: {
    handlers: {
      GET: async () => {
        const screens = listScreens();
        return Response.json(screens);
      },
      POST: async ({ request }) => {
        const body = await request.json();
        const { name, html } = body as { name: string; html: string };

        if (!validateScreenName(name)) {
          return Response.json(
            { error: "Invalid screen name. Use kebab-case." },
            { status: 400 },
          );
        }

        try {
          createScreen(name, html || "");
          return Response.json({ success: true, name });
        } catch (err) {
          return Response.json(
            { error: (err as Error).message },
            { status: 409 },
          );
        }
      },
    },
  },
});
