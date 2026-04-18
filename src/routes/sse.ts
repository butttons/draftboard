import { createFileRoute } from "@tanstack/react-router";
import { handleSSE } from "#/server/sse";
import { startWatcher } from "#/server/watcher";

startWatcher();

export const Route = createFileRoute("/sse")({
  server: {
    handlers: {
      GET: async () => handleSSE(),
    },
  },
});
