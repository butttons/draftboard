import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Result } from "better-result";
import { getDesignDir } from "./config";

export type Component = {
	name: string;
	variant?: string;
	html: string;
	props: Record<string, string>;
	slots: string[];
};

function getComponentsPath(cwd: string = process.cwd()): string {
	return join(getDesignDir(cwd), "components.html");
}

function extractSlots(html: string): string[] {
	const slots: string[] = [];
	const regex = /<!-- slot:(\w+) -->/g;
	let match;
	while ((match = regex.exec(html)) !== null) {
		if (!slots.includes(match[1])) {
			slots.push(match[1]);
		}
	}
	return slots;
}

function parseMarkerAttrs(str: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	// Match key=value or key="value with spaces"
	const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
	let match;
	while ((match = regex.exec(str)) !== null) {
		attrs[match[1]] = match[2] ?? match[3];
	}
	return attrs;
}

function parseComponents(content: string): Component[] {
	const components: Component[] = [];
	const regex = /<!-- ([a-zA-Z][\w-]*):start(.*?) -->([\s\S]*?)<!-- \1:end -->/g;
	let match;

	while ((match = regex.exec(content)) !== null) {
		const name = match[1];
		const attrsStr = match[2].trim();
		const html = match[3].trim();
		const props = parseMarkerAttrs(attrsStr);

		components.push({
			name,
			variant: props.variant,
			html,
			props,
			slots: extractSlots(html),
		});
	}

	return components;
}

export function listComponents(cwd: string = process.cwd()): Component[] {
	try {
		const content = readFileSync(getComponentsPath(cwd), "utf-8");
		return parseComponents(content);
	} catch {
		return [];
	}
}

export function getComponent(
	name: string,
	variant?: string,
	cwd: string = process.cwd(),
): Component | null {
	const components = listComponents(cwd);
	return (
		components.find(
			(c) => c.name === name && (!variant || c.variant === variant),
		) ?? null
	);
}

export function getComponentNames(cwd: string = process.cwd()): string[] {
	const components = listComponents(cwd);
	return [...new Set(components.map((c) => c.name))];
}

function buildComponentBlock({
	name,
	variant,
	html,
}: {
	name: string;
	variant?: string;
	html: string;
}): string {
	const attrs = variant ? ` variant="${variant}"` : "";
	return `<!-- ${name}:start${attrs} -->\n${html.trim()}\n<!-- ${name}:end -->`;
}

function findBlockRange({
	content,
	name,
	variant,
}: {
	content: string;
	name: string;
	variant?: string;
}): { start: number; end: number } | null {
	const regex = new RegExp(
		`<!-- ${name}:start(.*?) -->[\\s\\S]*?<!-- ${name}:end -->`,
		"g",
	);
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const attrs = parseMarkerAttrs(match[1].trim());
		if ((variant ?? undefined) === (attrs.variant ?? undefined)) {
			return { start: match.index, end: match.index + match[0].length };
		}
	}
	return null;
}

export function upsertComponent({
	name,
	html,
	variant,
	cwd = process.cwd(),
}: {
	name: string;
	html: string;
	variant?: string;
	cwd?: string;
}): Result<{ created: boolean }, Error> {
	if (!/^[a-z][a-z0-9-]*$/i.test(name)) {
		return Result.err(new Error("Invalid component name. Use a word identifier."));
	}
	if (html.trim().length === 0) {
		return Result.err(new Error("Component html must be non-empty."));
	}
	const path = getComponentsPath(cwd);
	const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
	const block = buildComponentBlock({ name, variant, html });
	const range = findBlockRange({ content: existing, name, variant });

	let next: string;
	let created: boolean;
	if (range) {
		next = existing.slice(0, range.start) + block + existing.slice(range.end);
		created = false;
	} else {
		const sep = existing.length > 0 && !existing.endsWith("\n\n") ? "\n\n" : "";
		next = existing + sep + block + "\n";
		created = true;
	}
	return Result.try(() => writeFileSync(path, next)).map(() => ({ created }));
}

export function deleteComponent({
	name,
	variant,
	cwd = process.cwd(),
}: {
	name: string;
	variant?: string;
	cwd?: string;
}): Result<void, Error> {
	const path = getComponentsPath(cwd);
	if (!existsSync(path)) {
		return Result.err(new Error("components.html does not exist."));
	}
	const existing = readFileSync(path, "utf-8");
	const range = findBlockRange({ content: existing, name, variant });
	if (!range) {
		const label = variant ? `${name}:${variant}` : name;
		return Result.err(new Error(`Component "${label}" not found.`));
	}
	let next = existing.slice(0, range.start) + existing.slice(range.end);
	next = next.replace(/\n{3,}/g, "\n\n");
	return Result.try(() => writeFileSync(path, next));
}

export function renderComponent(
	component: Component,
	props: Record<string, string> = {},
): string {
	let html = component.html;
	// Replace {{prop}} with provided values, fallback to defaults from marker
	for (const [key, value] of Object.entries({ ...component.props, ...props })) {
		html = html.replaceAll(`{{${key}}}`, value);
	}
	// Replace slots with placeholder comments
	for (const slot of component.slots) {
		if (!props[slot]) {
			html = html.replaceAll(
				`<!-- slot:${slot} -->`,
				`<!-- TODO: add ${slot} content -->`,
			);
		}
	}
	return html;
}
