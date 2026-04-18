import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Clock } from "lucide-react";
import { useState } from "react";
import { screensQueryOptions } from "#/server/queries";
import { createScreenFn, deleteScreenFn, isValidScreenName } from "#/server/functions";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(screensQueryOptions());
  },
  component: Canvas,
});

function Canvas() {
  const { data: screens = [] } = useQuery(screensQueryOptions());
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (name: string) => createScreenFn({ data: { name, html: "" } }),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      setNewName("");
      setIsCreating(false);
      router.navigate({ to: "/s/$name", params: { name } });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteScreenFn({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screens"] });
    },
  });

  function handleCreate() {
    if (!newName.trim()) return;
    const name = newName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!isValidScreenName(name)) return;
    createMutation.mutate(name);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-950 mb-6">Canvas</h1>

      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {screens.map((screen) => (
          <div
            key={screen.name}
            className="group relative border border-zinc-200 bg-white hover:border-zinc-300 transition"
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
              <div className="p-3 border-t border-zinc-200">
                <p className="text-sm font-medium text-zinc-950 truncate">{screen.name}</p>
                <p className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                  <Clock size={12} />
                  {formatDate(screen.updated_at)}
                </p>
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(screen.name);
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white border border-zinc-200 hover:border-red-300 hover:text-red-500 transition"
              aria-label={`Delete ${screen.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* New screen card */}
        <div className="border border-dashed border-zinc-300 bg-zinc-50 flex flex-col items-center justify-center aspect-[4/3]">
          {isCreating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="p-4 w-full"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="screen-name"
                autoFocus
                className="w-full border border-zinc-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-400 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-zinc-950 text-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
                >
                  {createMutation.isPending ? "..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName("");
                  }}
                  className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200"
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
        <div className="mt-8 border border-dashed border-zinc-300 p-12 text-center bg-zinc-50">
          <div className="w-12 h-12 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
            <Plus size={20} className="text-zinc-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-950 mb-2">No screens yet</h2>
          <p className="text-sm text-zinc-600 mb-6">
            Create a screen manually or connect an AI agent via MCP.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setIsCreating(true)}
              className="bg-zinc-950 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800"
            >
              Create first screen
            </button>
            <div className="text-xs text-zinc-400">
              MCP endpoint: <code className="bg-zinc-100 px-2 py-0.5">/mcp</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
