import { useEffect, useState, useCallback } from "react";
import type { McpAction } from "#/server/mcp/activity";

// -- Target mapping --

function actionTargets(action: McpAction, screenName?: string): string[] {
	switch (action) {
		case "list_screens":
			return ["sidebar:screens"];
		case "get_screen":
		case "update_screen":
		case "validate_screen":
		case "list_markers_in_screen":
		case "replace_component_in_screen":
			if (screenName) return [`screen:${screenName}`, `canvas:screen:${screenName}`];
			return [];
		case "create_screen":
		case "delete_screen":
		case "rename_screen":
			return ["sidebar:screens", "canvas"];
		case "validate_all_screens":
			return ["canvas"];
		case "get_design_doc":
		case "update_design_doc":
			return ["design"];
		case "update_layout":
			return ["layout"];
		case "list_components":
		case "get_component":
		case "upsert_component":
		case "delete_component":
			return ["components"];
		case "init_project":
			return ["*"];
		default:
			return [];
	}
}

function actionLabel(action: McpAction): string {
	const labels: Record<McpAction, string> = {
		init_project: "Initializing project",
		list_screens: "Listing screens",
		get_screen: "Reading screen",
		create_screen: "Creating screen",
		update_screen: "Updating screen",
		delete_screen: "Deleting screen",
		get_conventions: "Reading conventions",
		list_components: "Listing components",
		get_component: "Reading component",
		get_design_doc: "Reading design doc",
		update_design_doc: "Updating design doc",
		update_layout: "Updating layout",
		upsert_component: "Upserting component",
		delete_component: "Deleting component",
		list_markers_in_screen: "Listing markers",
		replace_component_in_screen: "Replacing marker",
		validate_screen: "Validating screen",
		validate_all_screens: "Validating all screens",
		find_screens_using: "Finding usages",
		find_screens_linking_to: "Finding links",
		rename_screen: "Renaming screen",
	};
	return labels[action] ?? action;
}

// -- Global activation store (outside React) --

const HOLD_MS = 5000;

type ActivationEntry = {
	label: string;
	screenName?: string;
	until: number;
};

// Target string -> activation info
const activations = new Map<string, ActivationEntry>();
const listeners = new Set<() => void>();

function notify() {
	for (const fn of listeners) fn();
}

/** Called from useSSE when it receives an isActive: true activity. */
export function recordTargetActivation(
	action: McpAction,
	screenName?: string,
) {
	const targets = actionTargets(action, screenName);
	const label = actionLabel(action);
	const until = Date.now() + HOLD_MS;

	for (const t of targets) {
		activations.set(t, { label, screenName, until });
	}
	// Also store under "*" for wildcard targets
	if (targets.includes("*")) {
		// Store a sentinel so any target can match
		activations.set("__all__", { label, screenName, until });
	}
	notify();
}

// Periodically clean up expired entries and notify listeners
if (typeof window !== "undefined") {
	setInterval(() => {
		const now = Date.now();
		let changed = false;
		for (const [key, entry] of activations) {
			if (now >= entry.until) {
				activations.delete(key);
				changed = true;
			}
		}
		if (changed) notify();
	}, 100);
}

// -- React hook --

export type McpTargetInfo = {
	isActive: boolean;
	label: string;
	screenName?: string;
};

export function useMcpTarget(target: string): McpTargetInfo {
	const [, setTick] = useState(0);

	useEffect(() => {
		const listener = () => setTick((n) => n + 1);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	const entry = activations.get(target) ?? activations.get("__all__");
	const now = Date.now();
	const isActive = entry != null && now < entry.until;

	if (isActive && entry) {
		return { isActive: true, label: entry.label, screenName: entry.screenName };
	}
	return { isActive: false, label: "" };
}
