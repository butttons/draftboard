import { addListener } from "./watcher";

const encoder = new TextEncoder();

export function createSSEStream(): ReadableStream {
  let controller: ReadableStreamDefaultController | null = null;
  let removeListener: (() => void) | null = null;

  return new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Send initial ping
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      // Listen for file changes
      removeListener = addListener((event) => {
        if (controller) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      });
    },
    cancel() {
      if (removeListener) {
        removeListener();
        removeListener = null;
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
