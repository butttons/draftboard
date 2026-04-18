import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp";

let transport: WebStandardStreamableHTTPServerTransport | null = null;

function getTransport(): WebStandardStreamableHTTPServerTransport {
  if (!transport) {
    const server = createMcpServer();
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    server.connect(transport);
  }
  return transport;
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const t = getTransport();
  return t.handleRequest(request);
}
