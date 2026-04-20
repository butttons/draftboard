import { useState, useRef, useEffect } from "react";
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
  LayoutGrid,
  Component,
  FileText,
  FilePlus,
  Layout,
  Search,
  CheckCircle,
  Link as LinkIcon,
  MoveRight,
  Tag,
} from "lucide-react";
import { fetchMcpActivities } from "#/server/functions";
import type { McpActivity, McpAction } from "#/server/mcp/activity";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#/components/ui/drawer";

const actionIcons: Record<McpAction, typeof Zap> = {
  init_project: Play,
  list_screens: List,
  get_screen: Eye,
  create_screen: Plus,
  update_screen: Pencil,
  delete_screen: Trash2,
  get_conventions: BookOpen,
  list_components: LayoutGrid,
  get_component: Component,
  get_design_doc: FileText,
  update_design_doc: FileText,
  update_layout: Layout,
  upsert_component: FilePlus,
  delete_component: Trash2,
  list_markers_in_screen: Tag,
  replace_component_in_screen: Pencil,
  validate_screen: CheckCircle,
  validate_all_screens: CheckCircle,
  find_screens_using: Search,
  find_screens_linking_to: LinkIcon,
  rename_screen: MoveRight,
};

const actionLabels: Record<McpAction, string> = {
  init_project: "Initialized project",
  list_screens: "Listed screens",
  get_screen: "Read screen",
  create_screen: "Created screen",
  update_screen: "Updated screen",
  delete_screen: "Deleted screen",
  get_conventions: "Read conventions",
  list_components: "Listed components",
  get_component: "Read component",
  get_design_doc: "Read design doc",
  update_design_doc: "Updated design doc",
  update_layout: "Updated layout",
  upsert_component: "Upserted component",
  delete_component: "Deleted component",
  list_markers_in_screen: "Listed markers",
  replace_component_in_screen: "Replaced marker",
  validate_screen: "Validated screen",
  validate_all_screens: "Validated all screens",
  find_screens_using: "Found usages",
  find_screens_linking_to: "Found links",
  rename_screen: "Renamed screen",
};

const actionProgressLabels: Record<McpAction, string> = {
  init_project: "Initializing project...",
  list_screens: "Listing screens...",
  get_screen: "Reading screen...",
  create_screen: "Creating screen...",
  update_screen: "Updating screen...",
  delete_screen: "Deleting screen...",
  get_conventions: "Reading conventions...",
  list_components: "Listing components...",
  get_component: "Reading component...",
  get_design_doc: "Reading design doc...",
  update_design_doc: "Updating design doc...",
  update_layout: "Updating layout...",
  upsert_component: "Upserting component...",
  delete_component: "Deleting component...",
  list_markers_in_screen: "Listing markers...",
  replace_component_in_screen: "Replacing marker...",
  validate_screen: "Validating screen...",
  validate_all_screens: "Validating all screens...",
  find_screens_using: "Finding usages...",
  find_screens_linking_to: "Finding links...",
  rename_screen: "Renaming screen...",
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
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition">
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

function ActiveTooltip({ activity }: { activity: McpActivity }) {
  const progressLabel =
    actionProgressLabels[activity.action] || `${activity.action}...`;
  const Icon = actionIcons[activity.action] || Zap;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium whitespace-nowrap shadow-lg">
        <Icon size={12} className="text-emerald-400" />
        <span>{progressLabel}</span>
        {activity.screenName && (
          <span className="text-zinc-400 font-mono">
            {activity.screenName}
          </span>
        )}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 -mt-1" />
    </div>
  );
}

const ACTIVE_HOLD_MS = 5000;

export default function McpStatusBadge() {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const { data: activities = [] } = useQuery({
    queryKey: ["mcpActivities"],
    queryFn: fetchMcpActivities,
    staleTime: 30_000,
  });

  const latestActivity = activities[0];
  const isTrulyActive = latestActivity?.isActive === true;

  // Hold the active visual for ACTIVE_HOLD_MS after we see isActive=true
  const [activeUntil, setActiveUntil] = useState<number | null>(null);

  useEffect(() => {
    if (isTrulyActive) {
      setActiveUntil(Date.now() + ACTIVE_HOLD_MS);
    }
  }, [isTrulyActive, latestActivity?.id]);

  const isActive =
    isTrulyActive || (activeUntil != null && Date.now() < activeUntil);

  // Clear hold when it expires
  useEffect(() => {
    if (activeUntil == null || isTrulyActive) return;
    const remaining = activeUntil - Date.now();
    if (remaining <= 0) {
      setActiveUntil(null);
      return;
    }
    const timer = setTimeout(() => setActiveUntil(null), remaining);
    return () => clearTimeout(timer);
  }, [activeUntil, isTrulyActive]);

  const hasRecent =
    !isActive &&
    latestActivity !== undefined &&
    Date.now() - new Date(latestActivity.timestamp).getTime() < 5000;

  return (
    <Drawer direction="right">
      <div
        className="relative"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        {isActive && isTooltipVisible && (
          <ActiveTooltip activity={latestActivity} />
        )}
        <DrawerTrigger
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition relative ${
            isActive
              ? "bg-blue-50 text-blue-700 ring-2 ring-blue-300 animate-mcp-pulse"
              : hasRecent
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          <Zap
            size={12}
            className={
              isActive
                ? "text-blue-500"
                : hasRecent
                  ? "text-emerald-500"
                  : "text-zinc-400"
            }
          />
          <span>MCP</span>
          {isActive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {hasRecent && !isActive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </DrawerTrigger>
      </div>
      <DrawerContent overlayClassName="supports-backdrop-filter:backdrop-blur-none bg-transparent">
        <DrawerHeader className="border-b border-zinc-100">
          <DrawerTitle className="flex items-center gap-2 text-sm">
            <Zap size={14} className="text-zinc-500" />
            MCP Activity
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium animate-pulse">
                Active
              </span>
            )}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="px-4 py-12 text-center">
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
      </DrawerContent>
    </Drawer>
  );
}
