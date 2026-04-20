import { createFileRoute } from "@tanstack/react-router";
import { generatePreviewHtml } from "#/server/preview";

export const Route = createFileRoute("/preview/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const html = generatePreviewHtml({ screenName: params.name });
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      },
    },
  },
});
