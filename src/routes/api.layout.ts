import { createFileRoute } from "@tanstack/react-router";
import { getLayoutHtml, writeLayoutHtml } from "#/server/fs";

export const Route = createFileRoute("/api/layout")({
  server: {
    handlers: {
      GET: async () => {
        const content = getLayoutHtml();
        return Response.json({ content });
      },
      PUT: async ({ request }) => {
        const body = await request.json();
        const { content } = body as { content: string };
        return writeLayoutHtml({ content }).match({
          ok: () => Response.json({ success: true }),
          err: (error) => Response.json({ error: error.message }, { status: 500 }),
        });
      },
    },
  },
});
