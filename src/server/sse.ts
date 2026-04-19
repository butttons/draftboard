import { addListener } from "./watcher";
import { addActivityListener } from "./mcp/activity";

const encoder = new TextEncoder();

export function createSSEStream(): ReadableStream {
  let controller: ReadableStreamDefaultController | null = null;
  let removeFileListener: (() => void) | null = null;
  let removeActivityListener: (() => void) | null = null;

  return new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Send initial ping
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      // Listen for file changes
      removeFileListener = addListener((event) => {
        if (controller) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      });

      // Listen for MCP activity
      removeActivityListener = addActivityListener((activity) => {
        if (controller) {
          const data = JSON.stringify({ type: "mcp_activity", activity });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      });
    },
    cancel() {
      if (removeFileListener) {
        removeFileListener();
        removeFileListener = null;
      }
      if (removeActivityListener) {
        removeActivityListener();
        removeActivityListener = null;
      }
      controller = null;
    },
  });
}

export function handleSSE(): Response {
  const stream = createSSEStream();
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
