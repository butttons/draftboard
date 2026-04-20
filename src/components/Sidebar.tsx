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
import { McpHighlight } from "./McpHighlight";

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
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
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
          draftboard
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

      <McpHighlight
        target="sidebar:screens"
        className="flex-1 overflow-y-auto p-2"
      >
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
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <FileCode2 size={16} />
                <span className="truncate w-40">{screen.name}</span>
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
      </McpHighlight>

      <div className="p-3 border-t border-zinc-200 mt-auto flex items-center gap-1">
        <McpStatusBadge />
        <McpSetupButton />
        <a
          href="https://github.com/butttons/draftboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition"
        >
          <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
