import { createFileRoute } from "@tanstack/react-router";
import { handleMcpRequest } from "#/server/mcp/handler";

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => handleMcpRequest(request),
      GET: async ({ request }) => handleMcpRequest(request),
      DELETE: async ({ request }) => handleMcpRequest(request),
    },
  },
});
