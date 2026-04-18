import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Trash2, Save, Code2, GripVertical, Minus, Plus } from "lucide-react";
import { useState, useCallback, useEffect, lazy, Suspense, useRef } from "react";
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
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("toolbar-position");
      if (saved) return JSON.parse(saved);
    }
    return { x: 16, y: 16 };
  });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const hasUnsavedChanges = html !== savedHtml;

  useEffect(() => {
    if (screen?.html !== undefined) {
      setHtml(screen.html);
      setSavedHtml(screen.html);
    }
  }, [screen?.html]);

  useEffect(() => {
    localStorage.setItem("toolbar-position", JSON.stringify(position));
  }, [position]);

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

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button, input, a")) return;
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }

  function handleMouseUp() {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  function handleRename() {
    if (!newName.trim() || newName === name) {
      setIsRenaming(false);
      setNewName(name);
      return;
    }
    renameMutation.mutate(newName.trim());
  }

  return (
    <div className="h-screen w-screen relative">
      {/* Full-screen preview */}
      <iframe
        src={`/preview/${name}`}
        className="w-full h-full border-0"
        title={`Preview of ${name}`}
      />

      {/* Floating toolbar */}
      <div
        ref={toolbarRef}
        onMouseDown={handleMouseDown}
        className="fixed flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-sm select-none"
        style={{ left: position.x, top: position.y, cursor: isDragging.current ? "grabbing" : "grab" }}
      >
        {minimized ? (
          /* Minimized state */
          <button
            onClick={() => setMinimized(false)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition"
            title="Expand toolbar"
          >
            <Plus size={18} />
          </button>
        ) : (
          /* Expanded state */
          <>
            <div className="pl-2 py-2 text-zinc-300 cursor-grab">
              <GripVertical size={16} />
            </div>

            <Link
              to="/"
              className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition"
              title="Back to canvas"
            >
              <ChevronLeft size={18} />
            </Link>

            <div className="w-px h-5 bg-zinc-200" />

            {isRenaming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRename();
                }}
                onMouseDown={(e) => e.stopPropagation()}
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

            <div className="w-px h-5 bg-zinc-200" />

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

            {hasUnsavedChanges && (
              <span className="text-xs text-zinc-400 mr-1">unsaved</span>
            )}

            <div className="w-px h-5 bg-zinc-200" />

            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 pr-2 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition"
              title="Minimize"
            >
              <Minus size={16} />
            </button>
          </>
        )}
      </div>

      {/* Editor panel */}
      {showEditor && (
        <div className="fixed top-16 left-4 bottom-4 w-[480px] bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
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
  );
}
