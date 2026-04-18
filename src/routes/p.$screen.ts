import { createFileRoute } from "@tanstack/react-router";
import { generatePreviewHtml } from "#/server/preview";

export const Route = createFileRoute("/p/$screen")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const html = generatePreviewHtml(params.screen);
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      },
    },
  },
});
