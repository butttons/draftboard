import { useState } from "react";
import { Settings, Copy, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Button } from "#/components/ui/button";

export default function McpSetupButton() {
  const [copied, setCopied] = useState<string | null>(null);

  function getMcpUrl() {
    return typeof window === "undefined"
      ? "http://localhost:<port>/mcp"
      : `${window.location.origin}/mcp`;
  }

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const mcpUrl = getMcpUrl();

  const claudeCmd = `claude mcp add --transport http draftboard ${mcpUrl}`;
  const opencodeConfig = JSON.stringify(
    {
      mcp: {
        draftboard: {
          type: "remote",
          url: mcpUrl,
          enabled: true,
        },
      },
    },
    null,
    2,
  );
  const jsonConfig = JSON.stringify(
    { mcpServers: { draftboard: { url: mcpUrl } } },
    null,
    2,
  );

  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition">
        <Settings size={14} />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-96 p-0">
        <PopoverHeader className="px-4 py-3 border-b border-zinc-100">
          <PopoverTitle className="flex items-center gap-2 text-sm">
            <Settings size={14} className="text-zinc-500" />
            MCP Setup
          </PopoverTitle>
        </PopoverHeader>

        <Tabs defaultValue="claude">
          <TabsList className="w-full rounded-none border-b border-zinc-100 bg-transparent p-0">
            <TabsTrigger
              value="claude"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-400 data-[state=active]:text-zinc-900"
            >
              Claude Code
            </TabsTrigger>
            <TabsTrigger
              value="opencode"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-400 data-[state=active]:text-zinc-900"
            >
              OpenCode
            </TabsTrigger>
            <TabsTrigger
              value="json"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-400 data-[state=active]:text-zinc-900"
            >
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude" className="p-4 space-y-4 mt-0">
            <div>
              <p className="text-xs text-zinc-500 mb-2">
                Run this command in your project directory:
              </p>
              <div className="relative">
                <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                  {claudeCmd}
                </pre>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copy(claudeCmd, "claude")}
                  className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                >
                  {copied === "claude" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Manage servers:</p>
              <code className="block text-xs bg-zinc-100 text-zinc-700 px-3 py-2 rounded-lg font-mono">
                claude mcp list
              </code>
              <code className="block text-xs bg-zinc-100 text-zinc-700 px-3 py-2 rounded-lg font-mono">
                claude mcp remove draftboard
              </code>
            </div>
          </TabsContent>

          <TabsContent value="opencode" className="p-4 space-y-4 mt-0">
            <div>
              <p className="text-xs text-zinc-500 mb-2">Run:</p>
              <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                opencode mcp add
              </pre>
              <p className="text-xs mt-2 text-zinc-500 mb-2">
                Or add to{" "}
                <code className="text-zinc-700">~/.opencode/config.json</code>:
              </p>
              <div className="relative">
                <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-x-auto">
                  {opencodeConfig}
                </pre>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copy(opencodeConfig, "opencode")}
                  className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                >
                  {copied === "opencode" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Manage servers:</p>
              <code className="block text-xs bg-zinc-100 text-zinc-700 px-3 py-2 rounded-lg font-mono">
                opencode mcp list
              </code>
            </div>
          </TabsContent>

          <TabsContent value="json" className="p-4 space-y-4 mt-0">
            <div>
              <p className="text-xs text-zinc-500 mb-2">
                Raw MCP config for any agent:
              </p>
              <div className="relative">
                <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-x-auto">
                  {jsonConfig}
                </pre>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copy(jsonConfig, "json")}
                  className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                >
                  {copied === "json" ? <Check size={12} /> : <Copy size={12} />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">MCP endpoint:</p>
              <code className="block text-xs bg-zinc-100 text-zinc-700 px-3 py-2 rounded-lg font-mono">
                {mcpUrl}
              </code>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
