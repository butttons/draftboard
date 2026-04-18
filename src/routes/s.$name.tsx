import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronRight, Trash2, Save, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";

export const Route = createFileRoute("/s/$name")({ component: ScreenEditor });

function ScreenEditor() {
  const { name } = Route.useParams();
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [savedHtml, setSavedHtml] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [splitPos, setSplitPos] = useState(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("splitPos")) || 50;
    }
    return 50;
  });
  const [externalChange, setExternalChange] = useState<string | null>(null);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasUnsavedChanges = html !== savedHtml;

  useEffect(() => {
    fetch(`/api/screens/${name}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.html !== undefined) {
          setHtml(data.html);
          setSavedHtml(data.html);
        }
      })
      .catch(console.error);
  }, [name]);

  useEffect(() => {
    const es = new EventSource("/sse");
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "screen_changed" && data.name === name) {
        fetch(`/api/screens/${name}`)
          .then((r) => r.json())
          .then((screenData) => {
            if (screenData.html !== undefined && screenData.html !== html) {
              if (hasUnsavedChanges) {
                setExternalChange(screenData.html);
              } else {
                setHtml(screenData.html);
                setSavedHtml(screenData.html);
              }
            }
          });
      }
    };
    return () => es.close();
  }, [name, html, hasUnsavedChanges]);

  const save = useCallback(async () => {
    await fetch(`/api/screens/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
    setSavedHtml(html);
    setExternalChange(null);
  }, [name, html]);

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

  function handleMouseDown() {
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(80, Math.max(20, pos));
    setSplitPos(clamped);
    localStorage.setItem("splitPos", String(clamped));
  }

  function handleMouseUp() {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  async function renameScreen() {
    if (!newName.trim() || newName === name) {
      setIsRenaming(false);
      setNewName(name);
      return;
    }
    await fetch(`/api/screens/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName: newName.trim() }),
    });
    router.navigate({ to: "/s/$name", params: { name: newName.trim() } });
    setIsRenaming(false);
  }

  async function deleteCurrentScreen() {
    await fetch(`/api/screens/${name}`, { method: "DELETE" });
    router.navigate({ to: "/" });
  }

  function acceptExternalChanges() {
    if (externalChange !== null) {
      setHtml(externalChange);
      setSavedHtml(externalChange);
      setExternalChange(null);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-zinc-400 hover:text-zinc-600 no-underline">
            Canvas
          </Link>
          <ChevronRight size={14} className="text-zinc-300" />
          {isRenaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                renameScreen();
              }}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="border border-zinc-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onBlur={renameScreen}
              />
            </form>
          ) : (
            <button
              onClick={() => setIsRenaming(true)}
              className="text-zinc-900 font-medium hover:text-blue-600 transition bg-transparent border-0 cursor-pointer text-sm"
            >
              {name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-zinc-400">Unsaved changes</span>
          )}
          <button
            onClick={save}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={deleteCurrentScreen}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition"
            aria-label="Delete screen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* External change banner */}
      {externalChange && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm">
          <AlertCircle size={16} className="text-amber-500" />
          <span className="text-amber-700">File changed on disk.</span>
          <button
            onClick={acceptExternalChanges}
            className="text-amber-700 underline hover:text-amber-900 bg-transparent border-0 cursor-pointer text-sm"
          >
            Reload
          </button>
          <button
            onClick={() => setExternalChange(null)}
            className="text-amber-500 hover:text-amber-700 bg-transparent border-0 cursor-pointer text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Split pane */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div style={{ width: `${splitPos}%` }} className="h-full overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="html"
            value={html}
            onChange={(value) => setHtml(value || "")}
            onBlur={save}
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

        {/* Resizer */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 bg-zinc-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors"
        />

        {/* Preview pane */}
        <div style={{ width: `${100 - splitPos}%` }} className="h-full bg-white">
          <iframe
            src={`/preview/${name}`}
            className="w-full h-full border-0"
            title={`Preview of ${name}`}
          />
        </div>
      </div>
    </div>
  );
}
