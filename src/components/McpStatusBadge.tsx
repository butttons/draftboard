import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  List,
  Eye,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Play,
} from "lucide-react";
import { fetchMcpActivities } from "#/server/functions";
import type { McpActivity, McpAction } from "#/server/mcp-activity";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover";

const actionIcons: Record<McpAction, typeof Zap> = {
  init_project: Play,
  list_screens: List,
  get_screen: Eye,
  create_screen: Plus,
  update_screen: Pencil,
  delete_screen: Trash2,
  get_conventions: BookOpen,
};

const actionLabels: Record<McpAction, string> = {
  init_project: "Initialized project",
  list_screens: "Listed screens",
  get_screen: "Read screen",
  create_screen: "Created screen",
  update_screen: "Updated screen",
  delete_screen: "Deleted screen",
  get_conventions: "Read conventions",
};

function formatTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityItem({ activity }: { activity: McpActivity }) {
  const Icon = actionIcons[activity.action] || Zap;
  const label = actionLabels[activity.action] || activity.action;

  return (
    <div className="flex items-start gap-3 px-3 py-2 hover:bg-zinc-50 transition">
      <div className="mt-0.5 p-1.5 rounded-md bg-zinc-100 text-zinc-600">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-900">{label}</span>
          {activity.screenName && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
              {activity.screenName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-zinc-400">
            {formatTime(activity.timestamp)}
          </span>
          {activity.duration !== undefined && (
            <span className="text-xs text-zinc-400">{activity.duration}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function McpStatusBadge() {
  const { data: activities = [] } = useQuery({
    queryKey: ["mcpActivities"],
    queryFn: fetchMcpActivities,
    staleTime: 30_000,
  });

  const hasRecent =
    activities.length > 0 &&
    Date.now() - new Date(activities[0].timestamp).getTime() < 5000;

  return (
    <Popover>
      <PopoverTrigger
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          hasRecent
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        <Zap
          size={12}
          className={hasRecent ? "text-emerald-500" : "text-zinc-400"}
        />
        <span>MCP</span>
        {hasRecent && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <PopoverHeader className="px-4 py-3 border-b border-zinc-100">
          <PopoverTitle className="flex items-center gap-2 text-sm">
            <Zap size={14} className="text-zinc-500" />
            MCP Activity
          </PopoverTitle>
        </PopoverHeader>

        <div className="max-h-80 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Zap size={24} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">No MCP activity yet</p>
              <p className="text-xs text-zinc-400 mt-1">
                Agent actions will appear here
              </p>
            </div>
          ) : (
            <div className="py-1">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>

        {activities.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
            <p className="text-xs text-zinc-400 text-center">
              {activities.length} action{activities.length !== 1 ? "s" : ""}{" "}
              recorded
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
