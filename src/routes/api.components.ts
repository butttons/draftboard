import { createFileRoute } from "@tanstack/react-router";
import { getComponentsHtml, writeComponentsHtml } from "#/server/fs";

export const Route = createFileRoute("/api/components")({
  server: {
    handlers: {
      GET: async () => {
        const content = getComponentsHtml();
        return Response.json({ content });
      },
      PUT: async ({ request }) => {
        const body = await request.json();
        const { content } = body as { content: string };
        writeComponentsHtml(content);
        return Response.json({ success: true });
      },
    },
  },
});
