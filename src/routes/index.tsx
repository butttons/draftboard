import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Clock } from "lucide-react";
import { useState } from "react";
import { screensQueryOptions } from "#/server/queries";
import { createScreenFn, deleteScreenFn, isValidScreenName } from "#/server/functions";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Card, CardContent } from "#/components/ui/card";

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
          <Card key={screen.name} className="group relative overflow-hidden">
            <Link to="/s/$name" params={{ name: screen.name }} className="block no-underline">
              <div className="aspect-[4/3] bg-zinc-50 overflow-hidden">
                <iframe
                  src={`/preview/${screen.name}`}
                  className="w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none border-0"
                  style={{ width: "400%", height: "400%" }}
                  title={`Preview of ${screen.name}`}
                />
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium text-zinc-950 truncate">{screen.name}</p>
                <p className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                  <Clock size={12} />
                  {formatDate(screen.updated_at)}
                </p>
              </CardContent>
            </Link>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:border-red-300"
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(screen.name);
              }}
              aria-label={`Delete ${screen.name}`}
            >
              <Trash2 size={14} />
            </Button>
          </Card>
        ))}

        {/* New screen card */}
        <Card className="border-dashed bg-zinc-50 flex flex-col items-center justify-center aspect-[4/3]">
          {isCreating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="p-4 w-full space-y-2"
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="screen-name"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? "..." : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-2 h-auto p-6 text-zinc-400 hover:text-zinc-600"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={24} />
              <span className="text-sm font-medium">New screen</span>
            </Button>
          )}
        </Card>
      </div>

      {screens.length === 0 && !isCreating && (
        <Card className="mt-8 border-dashed bg-zinc-50">
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 border border-zinc-200 flex items-center justify-center mx-auto mb-4 rounded-lg">
              <Plus size={20} className="text-zinc-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-950 mb-2">No screens yet</h2>
            <p className="text-sm text-zinc-600 mb-6">
              Create a screen manually or connect an AI agent via MCP.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button onClick={() => setIsCreating(true)}>
                Create first screen
              </Button>
              <p className="text-xs text-zinc-400">
                MCP endpoint: <code className="bg-zinc-100 px-2 py-0.5 rounded">/mcp</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
