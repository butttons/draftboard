import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Plus, Trash2, Clock } from "lucide-react";
import { useState, useEffect } from "react";

type Screen = {
  name: string;
  path: string;
  updated_at: string;
};

export const Route = createFileRoute("/")({ component: Canvas });

function Canvas() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchScreens();
  }, []);

  useEffect(() => {
    const es = new EventSource("/sse");
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "screen_changed") {
        fetchScreens();
      }
    };
    return () => es.close();
  }, []);

  function fetchScreens() {
    fetch("/api/screens")
      .then((r) => r.json())
      .then(setScreens)
      .catch(console.error);
  }

  async function createScreen() {
    if (!newName.trim()) return;
    const name = newName.trim().toLowerCase().replace(/\s+/g, "-");
    await fetch("/api/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, html: "" }),
    });
    setNewName("");
    setIsCreating(false);
    fetchScreens();
    router.navigate({ to: "/s/$name", params: { name } });
  }

  async function deleteScreen(name: string) {
    await fetch(`/api/screens/${name}`, { method: "DELETE" });
    fetchScreens();
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Canvas</h1>

      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {screens.map((screen) => (
          <div
            key={screen.name}
            className="group relative border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition"
          >
            <Link to="/s/$name" params={{ name: screen.name }} className="block no-underline">
              <div className="aspect-[4/3] bg-zinc-50 overflow-hidden">
                <iframe
                  src={`/preview/${screen.name}`}
                  className="w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none border-0"
                  style={{ width: "400%", height: "400%" }}
                  title={`Preview of ${screen.name}`}
                />
              </div>
              <div className="p-3 border-t border-zinc-100">
                <p className="text-sm font-medium text-zinc-900 truncate">{screen.name}</p>
                <p className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                  <Clock size={12} />
                  {formatDate(screen.updated_at)}
                </p>
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                deleteScreen(screen.name);
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-white/90 shadow-sm hover:bg-red-50 text-zinc-400 hover:text-red-500 transition"
              aria-label={`Delete ${screen.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* New screen card */}
        <div className="border border-dashed border-zinc-300 rounded-lg bg-zinc-50/50 flex flex-col items-center justify-center aspect-[4/3]">
          {isCreating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createScreen();
              }}
              className="p-4 w-full"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="screen-name"
                autoFocus
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName("");
                  }}
                  className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex flex-col items-center gap-2 text-zinc-400 hover:text-zinc-600 transition p-6"
            >
              <Plus size={24} />
              <span className="text-sm font-medium">New screen</span>
            </button>
          )}
        </div>
      </div>

      {screens.length === 0 && !isCreating && (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-lg bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Plus size={24} className="text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">No screens yet</h2>
          <p className="text-sm text-zinc-600 mb-4">
            Create your first screen or connect an AI agent via MCP.
          </p>
          <p className="text-xs text-zinc-400">
            MCP endpoint: <code className="bg-zinc-100 px-2 py-0.5 rounded">http://localhost:{window.location.port}/mcp</code>
          </p>
        </div>
      )}
    </div>
  );
}
