import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Save } from "lucide-react";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { componentsHtmlQueryOptions } from "#/server/queries";
import { saveComponentsHtml } from "#/server/functions";

export const Route = createFileRoute("/components")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(componentsHtmlQueryOptions());
  },
  component: ComponentsEditor,
});

function ComponentsEditor() {
  const queryClient = useQueryClient();
  const { data: content = "" } = useQuery(componentsHtmlQueryOptions());
  const [localContent, setLocalContent] = useState(content);

  const hasUnsavedChanges = localContent !== content;

  const saveMutation = useMutation({
    mutationFn: (newContent: string) => saveComponentsHtml({ data: { content: newContent } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["componentsHtml"] });
    },
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-zinc-400 hover:text-zinc-600 no-underline">
            Canvas
          </Link>
          <ChevronRight size={14} className="text-zinc-300" />
          <span className="text-zinc-900 font-medium">components.html</span>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-zinc-400">Unsaved changes</span>
          )}
          <button
            onClick={() => saveMutation.mutate(localContent)}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Save size={14} />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={localContent}
          onChange={(value) => setLocalContent(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
          theme="vs"
        />
      </div>
    </div>
  );
}
