import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Save } from "lucide-react";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { layoutHtmlQueryOptions } from "#/server/queries";
import { saveLayoutHtml } from "#/server/functions";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/layout")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(layoutHtmlQueryOptions());
  },
  component: LayoutEditor,
});

function LayoutEditor() {
  const queryClient = useQueryClient();
  const { data: content = "" } = useQuery(layoutHtmlQueryOptions());
  const [localContent, setLocalContent] = useState(content);

  const hasUnsavedChanges = localContent !== content;

  const saveMutation = useMutation({
    mutationFn: (newContent: string) => saveLayoutHtml({ data: { content: newContent } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layoutHtml"] });
    },
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-zinc-400 hover:text-zinc-600 text-sm">
            Canvas
          </Link>
          <ChevronRight size={14} className="text-zinc-300" />
          <span className="text-zinc-900 font-medium">layout.html</span>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-zinc-400">Unsaved changes</span>
          )}
          <Button
            size="sm"
            className="gap-1"
            onClick={() => saveMutation.mutate(localContent)}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
          >
            <Save size={14} />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
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
