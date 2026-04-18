import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCode2, LayoutGrid, Palette, Component, Trash2, Layers } from "lucide-react";
import { screensQueryOptions } from "#/server/queries";
import { deleteScreenFn } from "#/server/functions";

export default function Sidebar() {
  const { data: screens = [] } = useQuery(screensQueryOptions());
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteScreenFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
    },
  });

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-zinc-200 bg-zinc-50 flex flex-col">
      <div className="p-4 border-b border-zinc-200">
        <Link to="/" className="text-sm font-semibold text-zinc-950 no-underline tracking-tight">
          pi-design
        </Link>
      </div>

      <nav className="p-2 border-b border-zinc-200 space-y-1">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
            pathname === "/" ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <LayoutGrid size={16} />
          Canvas
        </Link>
        <Link
          to="/design"
          className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
            pathname === "/design" ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Palette size={16} />
          Design
        </Link>
        <Link
          to="/components"
          className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
            pathname === "/components" ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Component size={16} />
          Components
        </Link>
        <Link
          to="/layout"
          className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
            pathname === "/layout" ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Layers size={16} />
          Layout
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
              className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
                pathname === `/s/${screen.name}`
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <FileCode2 size={16} />
              <span className="truncate">{screen.name}</span>
            </Link>
            <button
              onClick={() => deleteMutation.mutate(screen.name)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 text-zinc-400 hover:text-red-500 transition"
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
