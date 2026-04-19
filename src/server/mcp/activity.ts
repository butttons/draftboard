export type McpAction =
	| "init_project"
	| "list_screens"
	| "get_screen"
	| "create_screen"
	| "update_screen"
	| "delete_screen"
	| "get_conventions"
	| "list_components"
	| "get_component"
	| "get_design_doc"
	| "update_design_doc"
	| "update_layout"
	| "upsert_component"
	| "delete_component"
	| "list_markers_in_screen"
	| "replace_component_in_screen"
	| "validate_screen"
	| "validate_all_screens"
	| "find_screens_using"
	| "find_screens_linking_to"
	| "rename_screen";

export type McpActivity = {
	id: string;
	action: McpAction;
	screenName?: string;
	timestamp: string;
	duration?: number;
};

type ActivityCallback = (activity: McpActivity) => void;

const MAX_HISTORY = 50;
const activities: McpActivity[] = [];
const listeners: Set<ActivityCallback> = new Set();
let counter = 0;

export function recordActivity(
	action: McpAction,
	screenName?: string,
	duration?: number,
): McpActivity {
	const activity: McpActivity = {
		id: `${Date.now()}-${counter++}`,
		action,
		screenName,
		timestamp: new Date().toISOString(),
		duration,
	};

	activities.unshift(activity);
	if (activities.length > MAX_HISTORY) {
		activities.length = MAX_HISTORY;
	}

	for (const listener of listeners) {
		listener(activity);
	}

	return activity;
}

export function getRecentActivities(): McpActivity[] {
	return [...activities];
}

export function addActivityListener(callback: ActivityCallback): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}
