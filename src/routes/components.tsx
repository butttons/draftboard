import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Save } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";

export const Route = createFileRoute("/components")({ component: ComponentsEditor });

function ComponentsEditor() {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const hasUnsavedChanges = content !== savedContent;

  useEffect(() => {
    fetch("/api/components")
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content);
        setSavedContent(data.content);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const es = new EventSource("/sse");
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "components_changed") {
        fetch("/api/components")
          .then((r) => r.json())
          .then((d) => {
            if (!hasUnsavedChanges) {
              setContent(d.content);
              setSavedContent(d.content);
            }
          });
      }
    };
    return () => es.close();
  }, [hasUnsavedChanges]);

  const save = useCallback(async () => {
    await fetch("/api/components", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSavedContent(content);
  }, [content]);

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
            onClick={save}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={content}
          onChange={(value) => setContent(value || "")}
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
    </div>
  );
}
