import { useState } from "react";
import { Settings, Copy, Check, X } from "lucide-react";

export default function McpSetupButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function getMcpUrl(): string {
    if (typeof window === "undefined") return "http://localhost:<port>/mcp";
    return `${window.location.origin}/mcp`;
  }

  function getConfigSnippet(): string {
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
        title="MCP Setup"
      >
        <Settings size={14} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-900">MCP Setup</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
        >
          <X size={14} />
        </button>
      </div>

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
    </div>
  );
}
