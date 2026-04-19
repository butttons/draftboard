import { readFileSync } from "node:fs";
import { join } from "node:path";
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
	const regex = /<!-- (\w+):start(.*?) -->([\s\S]*?)<!-- \1:end -->/g;
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
