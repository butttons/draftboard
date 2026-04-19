import { useState } from "react";
import { Settings, Copy, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover";

export default function McpSetupButton() {
  const [copied, setCopied] = useState(false);

  function getMcpUrl() {
    return typeof window === "undefined"
      ? "http://localhost:<port>/mcp"
      : `${window.location.origin}/mcp`;
  }

  function getConfigSnippet() {
    return JSON.stringify(
      { mcpServers: { design: { url: getMcpUrl() } } },
      null,
      2,
    );
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(getConfigSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Popover>
      <PopoverTrigger className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition">
        <Settings size={14} />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <PopoverHeader className="px-4 py-3 border-b border-zinc-100">
          <PopoverTitle className="flex items-center gap-2 text-sm">
            <Settings size={14} className="text-zinc-500" />
            MCP Setup
          </PopoverTitle>
        </PopoverHeader>

        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">
              Add this to your agent&apos;s MCP config:
            </p>
            <div className="relative">
              <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-x-auto">
                {getConfigSnippet()}
              </pre>
              <button
                onClick={copyConfig}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-500">MCP endpoint:</p>
            <code className="block text-xs bg-zinc-100 text-zinc-700 px-3 py-2 rounded-lg font-mono">
              {getMcpUrl()}
            </code>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              Agents connect here to create and edit screens programmatically.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
