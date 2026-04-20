import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Trash2,
  Save,
  Code2,
  ExternalLink,
  Monitor,
  Smartphone,
} from "lucide-react";
import { cn } from "#/lib/utils";
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { screenQueryOptions } from "#/server/queries";
import {
  updateScreenFn,
  deleteScreenFn,
  renameScreenFn,
} from "#/server/functions";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { McpHighlight } from "#/components/McpHighlight";

const Editor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({ default: module.default })),
);

export const Route = createFileRoute("/s/$name")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(screenQueryOptions(params.name));
  },
  pendingComponent: ScreenEditorPending,
  component: ScreenEditor,
});

function ScreenEditorPending() {
  const { name } = Route.useParams();
  return (
    <div className="h-screen flex flex-col">
      <div className="h-10 bg-white border-b border-zinc-200 flex items-center gap-2 px-3 flex-shrink-0">
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-300">
          <ChevronLeft size={18} />
        </div>
        <div className="w-px h-5 bg-zinc-200" />
        <span className="text-sm font-medium text-zinc-400">{name}</span>
        <div className="flex-1" />
      </div>
      <div className="flex-1 flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" />
          <p className="text-sm text-zinc-400">Loading screen...</p>
        </div>
      </div>
    </div>
  );
}

function ScreenEditor() {
  const { name } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: screen } = useQuery(screenQueryOptions(name));
  const [html, setHtml] = useState(screen?.html ?? "");
  const [savedHtml, setSavedHtml] = useState(screen?.html ?? "");
  const [showEditor, setShowEditor] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
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
    mutationFn: (content: string) =>
      updateScreenFn({ data: { name, html: content } }),
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
    mutationFn: (newNameVal: string) =>
      renameScreenFn({ data: { oldName: name, newName: newNameVal } }),
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
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if ((keyboardEvent.metaKey || keyboardEvent.ctrlKey) && keyboardEvent.key === "s") {
        keyboardEvent.preventDefault();
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
    <McpHighlight target={`screen:${name}`} className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-10 bg-white border-b border-zinc-200 flex items-center gap-2 px-3 flex-shrink-0">
        <Link
          to="/"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition"
          title="Back to canvas"
        >
          <ChevronLeft size={18} />
        </Link>

        <a
          href={`/p/${name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition"
          title="Open preview"
        >
          <ExternalLink size={16} />
        </a>

        <div className="w-px h-5 bg-zinc-200" />

        {isRenaming ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleRename();
            }}
          >
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              autoFocus
              className="h-7 w-32 text-sm"
              onBlur={handleRename}
            />
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 font-medium"
            onClick={() => setIsRenaming(true)}
          >
            {name}
          </Button>
        )}

        <div className="flex-1" />

        {hasUnsavedChanges && (
          <span className="text-xs text-zinc-400">unsaved</span>
        )}

        <ViewportSegment value={viewport} onChange={setViewport} />

        <Button
          variant={showEditor ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowEditor(!showEditor)}
          title="Toggle editor"
        >
          <Code2 size={18} />
        </Button>

        <Button
          size="sm"
          onClick={save}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
          className="gap-1"
        >
          <Save size={14} />
          {saveMutation.isPending ? "..." : "Save"}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          title="Delete screen"
        >
          <Trash2 size={18} />
        </Button>
      </div>

      {/* Preview */}
      <div className="flex-1 relative bg-zinc-50">
        {viewport === "desktop" ? (
          <iframe
            src={`/preview/${name}`}
            className="w-full h-full border-0 bg-white"
            title={`Preview of ${name}`}
          />
        ) : (
          <div className="w-full h-full overflow-auto flex items-start justify-center p-6">
            <div
              className="border border-zinc-200 bg-white rounded-lg shadow-md overflow-hidden flex-shrink-0"
              style={{ width: 390, height: 844 }}
            >
              <iframe
                src={`/preview/${name}`}
                className="w-full h-full border-0 bg-white"
                title={`Preview of ${name}`}
              />
            </div>
          </div>
        )}

        {/* Editor panel overlay */}
        {showEditor && (
          <div className="absolute top-0 right-0 bottom-0 w-[480px] bg-white border-l border-zinc-200 overflow-hidden z-10">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-zinc-400">
                  Loading editor...
                </div>
              }
            >
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
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                theme="vs"
              />
            </Suspense>
          </div>
        )}
      </div>
    </McpHighlight>
  );
}

function ViewportSegment({
  value,
  onChange,
}: {
  value: "desktop" | "mobile";
  onChange: (next: "desktop" | "mobile") => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Viewport"
      className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5"
    >
      <SegmentButton
        isActive={value === "desktop"}
        onClick={() => onChange("desktop")}
        label="Desktop"
      >
        <Monitor size={14} />
      </SegmentButton>
      <SegmentButton
        isActive={value === "mobile"}
        onClick={() => onChange("mobile")}
        label="Mobile"
      >
        <Smartphone size={14} />
      </SegmentButton>
    </div>
  );
}

function SegmentButton({
  isActive,
  onClick,
  label,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center h-7 w-8 rounded text-xs font-medium transition-colors",
        isActive
          ? "bg-white text-zinc-950 shadow-sm"
          : "text-zinc-500 hover:text-zinc-700",
      )}
    >
      {children}
    </button>
  );
}
