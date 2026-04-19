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
	for (const m of designMd.matchAll(COLOR_CLASS_RE)) allowed.add(m[0]);
	for (const m of designMd.matchAll(ARBITRARY_COLOR_RE)) allowed.add(m[0]);
	for (const m of designMd.matchAll(HEX_RE)) allowed.add(m[0].toLowerCase());
	return allowed;
}

function offsetToLine({
	content,
	offset,
}: {
	content: string;
	offset: number;
}): number {
	let line = 1;
	for (let i = 0; i < offset && i < content.length; i++) {
		if (content[i] === "\n") line++;
	}
	return line;
}

export function validateScreen({
	screenName,
}: {
	screenName: string;
}): { issues: Issue[] } {
	const screen = getScreen(screenName);
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
		ok: (m) => m,
		err: (e) => {
			issues.push({ severity: "error", line: 1, message: e.message });
			return null;
		},
	});
	if (markers === null) return { issues };

	const allowed = buildAllowedSet(getDesignMd());

	for (const m of html.matchAll(COLOR_CLASS_RE)) {
		if (!allowed.has(m[0])) {
			issues.push({
				severity: "warning",
				line: offsetToLine({ content: html, offset: m.index ?? 0 }),
				message: `Color class "${m[0]}" is not in design.md palette.`,
			});
		}
	}
	for (const m of html.matchAll(HEX_RE)) {
		if (!allowed.has(m[0].toLowerCase())) {
			issues.push({
				severity: "warning",
				line: offsetToLine({ content: html, offset: m.index ?? 0 }),
				message: `Hex color "${m[0]}" is not in design.md palette.`,
			});
		}
	}

	const componentNames = new Set(listComponents().map((c) => c.name));
	for (const m of markers) {
		if (!componentNames.has(m.name)) {
			issues.push({
				severity: "info",
				line: m.startLine,
				message: `Marker "${m.name}" has no matching entry in components.html (may be a one-off page-layout marker).`,
				marker: m.name,
			});
		}
	}

	const markerRanges = markers.map((m) => [m.outerStart, m.outerEnd] as const);
	const isInsideMarker = (offset: number): boolean =>
		markerRanges.some(([s, e]) => offset >= s && offset < e);

	for (const m of html.matchAll(COMPONENT_TAG_RE)) {
		const offset = m.index ?? 0;
		if (!isInsideMarker(offset)) {
			issues.push({
				severity: "warning",
				line: offsetToLine({ content: html, offset }),
				message: `<${m[1]}> is not wrapped in a component marker.`,
			});
		}
	}

	const existingScreens = new Set(listScreens().map((s) => s.name));
	for (const m of html.matchAll(HREF_RE)) {
		const href = m[1];
		const previewMatch = href.match(/^\/p\/([a-z0-9-]+)\/?$/);
		if (previewMatch && !existingScreens.has(previewMatch[1])) {
			issues.push({
				severity: "error",
				line: offsetToLine({ content: html, offset: m.index ?? 0 }),
				message: `Dead link to screen "${previewMatch[1]}".`,
			});
		}
	}

	issues.sort((a, b) => a.line - b.line);
	return { issues };
}

export function validateAllScreens(): Record<string, Issue[]> {
	const result: Record<string, Issue[]> = {};
	for (const s of listScreens()) {
		result[s.name] = validateScreen({ screenName: s.name }).issues;
	}
	return result;
}

export function findScreensUsing({
	markerName,
}: {
	markerName: string;
}): { screen_name: string; occurrences: number }[] {
	const hits: { screen_name: string; occurrences: number }[] = [];
	const re = new RegExp(`<!--\\s+${markerName}:start\\b`, "g");
	for (const s of listScreens()) {
		const screen = getScreen(s.name);
		if (!screen) continue;
		const matches = screen.html.match(re);
		if (matches && matches.length > 0) {
			hits.push({ screen_name: s.name, occurrences: matches.length });
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
	const re = new RegExp(
		`href="(?:/p/)?${screenName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}/?"`,
		"g",
	);
	for (const s of listScreens()) {
		if (s.name === screenName) continue;
		const screen = getScreen(s.name);
		if (!screen) continue;
		const matches = screen.html.match(re);
		if (matches && matches.length > 0) {
			hits.push({ screen_name: s.name, occurrences: matches.length });
		}
	}
	return hits;
}
