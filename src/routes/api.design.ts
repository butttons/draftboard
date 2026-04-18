import { createFileRoute } from "@tanstack/react-router";
import { getDesignMd, writeDesignMd } from "#/server/fs";

export const Route = createFileRoute("/api/design")({
  server: {
    handlers: {
      GET: async () => {
        const content = getDesignMd();
        return Response.json({ content });
      },
      PUT: async ({ request }) => {
        const body = await request.json();
        const { content } = body as { content: string };
        writeDesignMd(content);
        return Response.json({ success: true });
      },
    },
  },
});
