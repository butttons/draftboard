import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileCode2,
  LayoutGrid,
  Palette,
  Component,
  Trash2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { screensQueryOptions } from "#/server/queries";
import { deleteScreenFn } from "#/server/functions";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import McpStatusBadge from "./McpStatusBadge";
import McpSetupButton from "./McpSetupButton";

const navItems = [
  { to: "/", icon: LayoutGrid, label: "Canvas" },
  { to: "/design", icon: Palette, label: "Design" },
  { to: "/components", icon: Component, label: "Components" },
  { to: "/layout", icon: Layers, label: "Layout" },
  { to: "/help", icon: HelpCircle, label: "Help" },
] as const;

function NavLink({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: typeof LayoutGrid;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-zinc-950 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

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
        <Link
          to="/"
          className="text-sm font-semibold text-zinc-950 no-underline tracking-tight"
        >
          @butttons/draftboard
        </Link>
      </div>

      <nav className="p-2 border-b border-zinc-200 space-y-0.5">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            icon={icon}
            label={label}
            active={pathname === to}
          />
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2.5 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Screens
        </p>
        <div className="space-y-0.5">
          {screens.map((screen) => (
            <div key={screen.name} className="group relative">
              <Link
                to="/s/$name"
                params={{ name: screen.name }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition",
                  pathname === `/s/${screen.name}`
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <FileCode2 size={16} />
                <span className="truncate">{screen.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                onClick={() => deleteMutation.mutate(screen.name)}
                aria-label={`Delete ${screen.name}`}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
        {screens.length === 0 && (
          <p className="px-2.5 py-2 text-sm text-zinc-400">No screens yet</p>
        )}
      </div>

      <div className="p-3 border-t border-zinc-200 flex items-center gap-2">
        <McpStatusBadge />
        <McpSetupButton />
      </div>
    </aside>
  );
}
