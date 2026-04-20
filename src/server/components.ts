import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Result } from "better-result";
import { getDesignDir } from "./config";

export type Component = {
	name: string;
	variant?: string;
	props: string[];
	slots: string[];
	html: string;
};

export type ComponentValidation = {
	errors: string[];
	warnings: string[];
};

function getComponentsPath(cwd: string = process.cwd()): string {
	return join(getDesignDir(cwd), "components.html");
}

function parseMarkerAttrs(str: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(str)) !== null) {
		attrs[match[1]] = match[2] ?? match[3];
	}
	return attrs;
}

function splitList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function extractReferencedProps(html: string): string[] {
	const names = new Set<string>();
	const re = /\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(html)) !== null) names.add(match[1]);
	return [...names];
}

export function extractReferencedSlots(html: string): string[] {
	const names = new Set<string>();
	const re = /<!--\s*slot:([a-zA-Z_][\w-]*)\s*-->/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(html)) !== null) names.add(match[1]);
	return [...names];
}

function parseComponents(content: string): Component[] {
	const components: Component[] = [];
	const regex = /<!-- ([a-zA-Z][\w-]*):start(.*?) -->([\s\S]*?)<!-- \1:end -->/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const name = match[1];
		const attrs = parseMarkerAttrs(match[2].trim());
		const html = match[3].trim();

		const declaredProps = splitList(attrs.props);
		const declaredSlots = splitList(attrs.slots);
		const props = declaredProps.length > 0 ? declaredProps : extractReferencedProps(html);
		const slots = declaredSlots.length > 0 ? declaredSlots : extractReferencedSlots(html);

		components.push({
			name,
			variant: attrs.variant,
			props,
			slots,
			html,
		});
	}
	return components;
}

export function listComponents({ cwd = process.cwd() }: { cwd?: string } = {}): Component[] {
	try {
		const content = readFileSync(getComponentsPath(cwd), "utf-8");
		return parseComponents(content);
	} catch {
		return [];
	}
}

export function getComponent({
	name,
	variant,
	cwd = process.cwd(),
}: {
	name: string;
	variant?: string;
	cwd?: string;
}): Component | null {
	const components = listComponents({ cwd });
	return (
		components.find(
			(component) => component.name === name && (!variant || component.variant === variant),
		) ?? null
	);
}

export function getComponentNames({ cwd = process.cwd() }: { cwd?: string } = {}): string[] {
	const components = listComponents({ cwd });
	return [...new Set(components.map((component) => component.name))];
}

function buildComponentBlock({
	name,
	variant,
	props,
	slots,
	html,
}: {
	name: string;
	variant?: string;
	props: string[];
	slots: string[];
	html: string;
}): string {
	const attrs: string[] = [];
	if (variant) attrs.push(`variant="${variant}"`);
	if (props.length > 0) attrs.push(`props="${props.join(",")}"`);
	if (slots.length > 0) attrs.push(`slots="${slots.join(",")}"`);
	const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
	return `<!-- ${name}:start${attrStr} -->\n${html.trim()}\n<!-- ${name}:end -->`;
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

const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DOCUMENT_TAG_RE = /<\s*(html|head|body|script)\b/i;

export function validateComponentInput({
	name,
	variant,
	html,
	props,
	slots,
}: {
	name: string;
	variant?: string;
	html: string;
	props: string[];
	slots: string[];
}): ComponentValidation {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!KEBAB_RE.test(name)) {
		errors.push(
			`Component name "${name}" must be kebab-case (e.g. "info-card", lowercase letters, digits, and single hyphens).`,
		);
	}
	if (variant !== undefined && variant.length > 0 && !/^[a-z][a-z0-9-]*$/i.test(variant)) {
		errors.push(`Variant "${variant}" must be a simple identifier.`);
	}
	if (html.trim().length === 0) {
		errors.push("Component html must be non-empty.");
	}

	const startMarker = new RegExp(`<!--\\s*${name}:start\\b`);
	const endMarker = new RegExp(`<!--\\s*${name}:end\\b`);
	if (startMarker.test(html) || endMarker.test(html)) {
		errors.push(
			`Do not include <!-- ${name}:start --> or <!-- ${name}:end --> in html; the server adds them. Pass the inner HTML only.`,
		);
	}

	const docTag = html.match(DOCUMENT_TAG_RE);
	if (docTag) {
		errors.push(
			`Pass a component fragment, not a full document. Remove the <${docTag[1].toLowerCase()}> tag.`,
		);
	}

	const referencedProps = new Set(extractReferencedProps(html));
	const referencedSlots = new Set(extractReferencedSlots(html));
	const declaredProps = new Set(props);
	const declaredSlots = new Set(slots);

	for (const ref of referencedProps) {
		if (!declaredProps.has(ref)) {
			errors.push(
				`Undeclared prop "${ref}" referenced via {{${ref}}}. Add it to the props array or remove the reference.`,
			);
		}
	}
	for (const ref of referencedSlots) {
		if (!declaredSlots.has(ref)) {
			errors.push(
				`Undeclared slot "${ref}" referenced via <!-- slot:${ref} -->. Add it to the slots array or remove the reference.`,
			);
		}
	}
	for (const propName of declaredProps) {
		if (!referencedProps.has(propName)) {
			warnings.push(`Declared prop "${propName}" is unused in html.`);
		}
	}
	for (const slotName of declaredSlots) {
		if (!referencedSlots.has(slotName)) {
			warnings.push(`Declared slot "${slotName}" is unused in html.`);
		}
	}

	return { errors, warnings };
}

export function upsertComponent({
	name,
	html,
	variant,
	props = [],
	slots = [],
	cwd = process.cwd(),
}: {
	name: string;
	html: string;
	variant?: string;
	props?: string[];
	slots?: string[];
	cwd?: string;
}): Result<{ created: boolean; warnings: string[] }, Error> {
	const validation = validateComponentInput({ name, variant, html, props, slots });
	if (validation.errors.length > 0) {
		return Result.err(new Error(validation.errors.join("\n")));
	}

	const filePath = getComponentsPath(cwd);
	const existing = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
	const block = buildComponentBlock({ name, variant, props, slots, html });
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
	return Result.try(() => writeFileSync(filePath, next)).map(() => ({
		created,
		warnings: validation.warnings,
	}));
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
	const filePath = getComponentsPath(cwd);
	if (!existsSync(filePath)) {
		return Result.err(new Error("components.html does not exist."));
	}
	const existing = readFileSync(filePath, "utf-8");
	const range = findBlockRange({ content: existing, name, variant });
	if (!range) {
		const label = variant ? `${name}:${variant}` : name;
		return Result.err(new Error(`Component "${label}" not found.`));
	}
	let next = existing.slice(0, range.start) + existing.slice(range.end);
	next = next.replace(/\n{3,}/g, "\n\n");
	return Result.try(() => writeFileSync(filePath, next));
}

export function renderComponent({
	component,
	props = {},
}: {
	component: Component;
	props?: Record<string, string>;
}): string {
	let html = component.html;
	for (const [key, value] of Object.entries(props)) {
		html = html.replaceAll(`{{${key}}}`, value);
	}
	for (const slot of component.slots) {
		if (!(slot in props)) {
			html = html.replaceAll(
				`<!-- slot:${slot} -->`,
				`<!-- TODO: add ${slot} content -->`,
			);
		}
	}
	return html;
}
