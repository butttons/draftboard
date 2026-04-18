import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Trash2, Save, Code2, ExternalLink } from "lucide-react";
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { screenQueryOptions } from "#/server/queries";
import { updateScreenFn, deleteScreenFn, renameScreenFn } from "#/server/functions";

const Editor = lazy(() => import("@monaco-editor/react").then(m => ({ default: m.default })));

export const Route = createFileRoute("/s/$name")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(screenQueryOptions(params.name));
  },
  component: ScreenEditor,
});

function ScreenEditor() {
  const { name } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: screen } = useQuery(screenQueryOptions(name));
  const [html, setHtml] = useState(screen?.html ?? "");
  const [savedHtml, setSavedHtml] = useState(screen?.html ?? "");
  const [showEditor, setShowEditor] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);

  const hasUnsavedChanges = html !== savedHtml;

  useEffect(() => {
    if (screen?.html !== undefined) {
      setHtml(screen.html);
      setSavedHtml(screen.html);
    }
  }, [screen?.html]);

  const saveMutation = useMutation({
    mutationFn: (content: string) => updateScreenFn({ data: { name, html: content } }),
    onSuccess: () => {
      setSavedHtml(html);
      queryClient.invalidateQueries({ queryKey: ["screen", name] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScreenFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      router.navigate({ to: "/" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (newNameVal: string) => renameScreenFn({ data: { oldName: name, newName: newNameVal } }),
    onSuccess: (_, newNameVal) => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      router.navigate({ to: "/s/$name", params: { name: newNameVal } });
      setIsRenaming(false);
    },
  });

  const save = useCallback(() => {
    saveMutation.mutate(html);
  }, [html, saveMutation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  function handleRename() {
    if (!newName.trim() || newName === name) {
      setIsRenaming(false);
      setNewName(name);
      return;
    }
    renameMutation.mutate(newName.trim());
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-10 bg-white border-b border-zinc-200 flex items-center gap-2 px-3 flex-shrink-0">
        <Link
          to="/"
          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition"
          title="Back to canvas"
        >
          <ChevronLeft size={18} />
        </Link>

        <a
          href={`/p/${name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition"
          title="Open preview in new tab"
        >
          <ExternalLink size={16} />
        </a>

        <div className="w-px h-5 bg-zinc-200" />

        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRename();
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              className="border border-zinc-200 rounded px-2 py-0.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onBlur={handleRename}
            />
          </form>
        ) : (
          <button
            onClick={() => setIsRenaming(true)}
            className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition bg-transparent border-0 cursor-pointer"
          >
            {name}
          </button>
        )}

        <div className="flex-1" />

        {hasUnsavedChanges && (
          <span className="text-xs text-zinc-400">unsaved</span>
        )}

        <button
          onClick={() => setShowEditor(!showEditor)}
          className={`p-1.5 rounded transition ${
            showEditor ? "bg-blue-100 text-blue-600" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
          }`}
          title="Toggle editor"
        >
          <Code2 size={18} />
        </button>

        <button
          onClick={save}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Save size={14} />
          {saveMutation.isPending ? "..." : "Save"}
        </button>

        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition"
          title="Delete screen"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 relative">
        <iframe
          src={`/preview/${name}`}
          className="w-full h-full border-0"
          title={`Preview of ${name}`}
        />

        {/* Editor panel overlay */}
        {showEditor && (
          <div className="absolute top-0 right-0 bottom-0 w-[480px] bg-white border-l border-zinc-200 shadow-lg overflow-hidden z-10">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-400">Loading editor...</div>}>
              <Editor
                height="100%"
                defaultLanguage="html"
                value={html}
                onChange={(value) => setHtml(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
                theme="vs"
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
