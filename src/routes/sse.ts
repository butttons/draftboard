import { createFileRoute } from "@tanstack/react-router";
import { handleSSE } from "#/server/sse";

export const Route = createFileRoute("/sse")({
  server: {
    handlers: {
      GET: async () => handleSSE(),
    },
  },
});
