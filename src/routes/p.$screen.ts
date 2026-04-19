import { createFileRoute } from "@tanstack/react-router";
import { generateLivePreviewHtml } from "#/server/preview";

export const Route = createFileRoute("/p/$screen")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const html = generateLivePreviewHtml(params.screen);
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      },
    },
  },
});
