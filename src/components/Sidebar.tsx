import { Link, useRouterState } from "@tanstack/react-router";
import { FileCode2, LayoutGrid, Palette, Component, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

type Screen = {
  name: string;
  path: string;
  updated_at: string;
};

export default function Sidebar() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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

  async function deleteScreen(name: string) {
    await fetch(`/api/screens/${name}`, { method: "DELETE" });
    fetchScreens();
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-zinc-200 bg-zinc-50 flex flex-col">
      <div className="p-4 border-b border-zinc-200">
        <Link to="/" className="text-lg font-semibold text-zinc-900 no-underline">
          pi-design
        </Link>
      </div>

      <nav className="p-2 border-b border-zinc-200">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
            pathname === "/" ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <LayoutGrid size={16} />
          Canvas
        </Link>
        <Link
          to="/design"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
            pathname === "/design" ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Palette size={16} />
          Design
        </Link>
        <Link
          to="/components"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
            pathname === "/components" ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Component size={16} />
          Components
        </Link>
      </nav>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Screens
        </p>
        {screens.map((screen) => (
          <div key={screen.name} className="group relative">
            <Link
              to="/s/$name"
              params={{ name: screen.name }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                pathname === `/s/${screen.name}`
                  ? "bg-zinc-200 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <FileCode2 size={16} />
              <span className="truncate">{screen.name}</span>
            </Link>
            <button
              onClick={() => deleteScreen(screen.name)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 text-zinc-400 hover:text-red-500 transition"
              aria-label={`Delete ${screen.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {screens.length === 0 && (
          <p className="px-3 py-2 text-sm text-zinc-400">No screens yet</p>
        )}
      </div>
    </aside>
  );
}
