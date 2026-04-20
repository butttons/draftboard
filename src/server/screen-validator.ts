import { getDesignMd, getScreen, listScreens } from "./fs";
import { listComponents } from "./components";
import { parseMarkers } from "./markers";

export type Issue = {
	severity: "error" | "warning" | "info";
	line: number;
	message: string;
	marker?: string;
};

const COLOR_FAMILIES = [
	"red",
	"orange",
	"amber",
	"yellow",
	"lime",
	"green",
	"emerald",
	"teal",
	"cyan",
	"sky",
	"blue",
	"indigo",
	"violet",
	"purple",
	"fuchsia",
	"pink",
	"rose",
	"slate",
	"gray",
	"neutral",
	"stone",
	"zinc",
];

const COLOR_CLASS_RE = new RegExp(
	`\\b(bg|text|border|ring|from|to|via|fill|stroke)-(${COLOR_FAMILIES.join("|")})-\\d{2,3}\\b`,
	"g",
);
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const ARBITRARY_COLOR_RE = /\b(bg|text|border|ring)-\[[^\]]+\]/g;
const COMPONENT_TAG_RE = /<(button|input|select|textarea)\b/gi;
const HREF_RE = /<a\s[^>]*href="([^"]+)"/gi;

function buildAllowedSet(designMd: string): Set<string> {
	const allowed = new Set<string>();
	for (const match of designMd.matchAll(COLOR_CLASS_RE)) allowed.add(match[0]);
	for (const match of designMd.matchAll(ARBITRARY_COLOR_RE)) allowed.add(match[0]);
	for (const match of designMd.matchAll(HEX_RE)) allowed.add(match[0].toLowerCase());
	return allowed;
}

function offsetToLine({
	content,
	offset,
}: {
	content: string;
	offset: number;
}): number {
	let lineNumber = 1;
	for (let index = 0; index < offset && index < content.length; index++) {
		if (content[index] === "\n") lineNumber++;
	}
	return lineNumber;
}

export function validateScreen({
	screenName,
}: {
	screenName: string;
}): { issues: Issue[] } {
	const screen = getScreen({ name: screenName });
	if (!screen) {
		return {
			issues: [
				{
					severity: "error",
					line: 1,
					message: `Screen "${screenName}" not found.`,
				},
			],
		};
	}
	const html = screen.html;
	const issues: Issue[] = [];

	const markerResult = parseMarkers(html);
	const markers = markerResult.match({
		ok: (parsed) => parsed,
		err: (error) => {
			issues.push({ severity: "error", line: 1, message: error.message });
			return null;
		},
	});
	if (markers === null) return { issues };

	const allowed = buildAllowedSet(getDesignMd());

	for (const match of html.matchAll(COLOR_CLASS_RE)) {
		if (!allowed.has(match[0])) {
			issues.push({
				severity: "warning",
				line: offsetToLine({ content: html, offset: match.index ?? 0 }),
				message: `Color class "${match[0]}" is not in design.md palette.`,
			});
		}
	}
	for (const match of html.matchAll(HEX_RE)) {
		if (!allowed.has(match[0].toLowerCase())) {
			issues.push({
				severity: "warning",
				line: offsetToLine({ content: html, offset: match.index ?? 0 }),
				message: `Hex color "${match[0]}" is not in design.md palette.`,
			});
		}
	}

	const componentNames = new Set(listComponents().map((comp) => comp.name));
	for (const marker of markers) {
		if (!componentNames.has(marker.name)) {
			issues.push({
				severity: "info",
				line: marker.startLine,
				message: `Marker "${marker.name}" has no matching entry in components.html (may be a one-off page-layout marker).`,
				marker: marker.name,
			});
		}
	}

	const markerRanges = markers.map((marker) => [marker.outerStart, marker.outerEnd] as const);
	const isInsideMarker = (offset: number): boolean =>
		markerRanges.some(([start, end]) => offset >= start && offset < end);

	for (const match of html.matchAll(COMPONENT_TAG_RE)) {
		const offset = match.index ?? 0;
		if (!isInsideMarker(offset)) {
			issues.push({
				severity: "warning",
				line: offsetToLine({ content: html, offset }),
				message: `<${match[1]}> is not wrapped in a component marker.`,
			});
		}
	}

	const existingScreens = new Set(listScreens().map((screenItem) => screenItem.name));
	for (const match of html.matchAll(HREF_RE)) {
		const href = match[1];
		const previewMatch = href.match(/^\/p\/([a-z0-9-]+)\/?$/);
		if (previewMatch && !existingScreens.has(previewMatch[1])) {
			issues.push({
				severity: "error",
				line: offsetToLine({ content: html, offset: match.index ?? 0 }),
				message: `Dead link to screen "${previewMatch[1]}".`,
			});
		}
	}

	issues.sort((a, b) => a.line - b.line);
	return { issues };
}

export function validateAllScreens(): Record<string, Issue[]> {
	const result: Record<string, Issue[]> = {};
	for (const screen of listScreens()) {
		result[screen.name] = validateScreen({ screenName: screen.name }).issues;
	}
	return result;
}

export function findScreensUsing({
	markerName,
}: {
	markerName: string;
}): { screen_name: string; occurrences: number }[] {
	const hits: { screen_name: string; occurrences: number }[] = [];
	const markerRe = new RegExp(`<!--\\s+${markerName}:start\\b`, "g");
	for (const screen of listScreens()) {
		const screenData = getScreen({ name: screen.name });
		if (!screenData) continue;
		const matches = screenData.html.match(markerRe);
		if (matches && matches.length > 0) {
			hits.push({ screen_name: screen.name, occurrences: matches.length });
		}
	}
	return hits;
}

export function findScreensLinkingTo({
	screenName,
}: {
	screenName: string;
}): { screen_name: string; occurrences: number }[] {
	const hits: { screen_name: string; occurrences: number }[] = [];
	const linkRe = new RegExp(
		`href="(?:/p/)?${screenName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}/?"`,
		"g",
	);
	for (const screen of listScreens()) {
		if (screen.name === screenName) continue;
		const screenData = getScreen({ name: screen.name });
		if (!screenData) continue;
		const matches = screenData.html.match(linkRe);
		if (matches && matches.length > 0) {
			hits.push({ screen_name: screen.name, occurrences: matches.length });
		}
	}
	return hits;
}
