import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Result } from "better-result";
import { getDesignDir, getScreensDir } from "./config";
import { validateScreenName } from "./validation";
import { startWatcher } from "./watcher";
import { DEFAULT_DESIGN_MD, DEFAULT_COMPONENTS_HTML, DEFAULT_LAYOUT_HTML } from "./defaults";

// Start file watcher for live updates
if (typeof window === "undefined") {
	startWatcher();
}

export type Screen = {
	name: string;
	path: string;
	updated_at: string;
};

export type ScaffoldResult = {
	alreadyInitialized: boolean;
	created: string[];
};

export function isProjectInitialized({ cwd = process.cwd() }: { cwd?: string } = {}): boolean {
	return existsSync(join(getDesignDir(cwd), "design.md"));
}

export function ensureDesignDirs({ cwd = process.cwd() }: { cwd?: string } = {}): void {
	const designDir = getDesignDir(cwd);
	const screensDir = getScreensDir(cwd);
	if (!existsSync(designDir)) mkdirSync(designDir, { recursive: true });
	if (!existsSync(screensDir)) mkdirSync(screensDir, { recursive: true });
}

export function scaffoldDesignDir({ cwd = process.cwd() }: { cwd?: string } = {}): ScaffoldResult {
	if (isProjectInitialized({ cwd })) {
		return { alreadyInitialized: true, created: [] };
	}

	ensureDesignDirs({ cwd });

	const designDir = getDesignDir(cwd);
	const created: string[] = [];

	const files: { path: string; content: string; label: string }[] = [
		{ path: join(designDir, "design.md"), content: DEFAULT_DESIGN_MD, label: "design.md" },
		{ path: join(designDir, "components.html"), content: DEFAULT_COMPONENTS_HTML, label: "components.html" },
		{ path: join(designDir, "layout.html"), content: DEFAULT_LAYOUT_HTML, label: "layout.html" },
	];

	for (const file of files) {
		if (!existsSync(file.path)) {
			writeFileSync(file.path, file.content);
			created.push(file.label);
		}
	}

	return { alreadyInitialized: false, created };
}

export function listScreens({ cwd = process.cwd() }: { cwd?: string } = {}): Screen[] {
	const screensDir = getScreensDir(cwd);
	if (!existsSync(screensDir)) return [];

	const files = readdirSync(screensDir).filter((file) => file.endsWith(".html"));
	return files.map((file) => {
		const name = file.replace(/\.html$/, "");
		const filePath = join(screensDir, file);
		const stat = statSync(filePath);
		return {
			name,
			path: `screens/${file}`,
			updated_at: stat.mtime.toISOString(),
		};
	});
}

export function getScreen({
	name,
	cwd = process.cwd(),
}: {
	name: string;
	cwd?: string;
}): { name: string; html: string } | null {
	if (!validateScreenName(name)) return null;
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (!existsSync(filePath)) return null;
	return { name, html: readFileSync(filePath, "utf-8") };
}

export function getScreenLines({
	name,
	start,
	end,
	cwd = process.cwd(),
}: {
	name: string;
	start: number;
	end: number;
	cwd?: string;
}): Result<
	{ name: string; lines: string[]; start: number; end: number; total: number },
	string
> {
	if (!validateScreenName(name)) {
		return Result.err("Invalid screen name.");
	}
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (!existsSync(filePath)) {
		return Result.err(`Screen "${name}" not found.`);
	}
	const content = readFileSync(filePath, "utf-8");
	const allLines = content.split("\n");
	const total = allLines.length;

	if (start < 1) return Result.err("Start line must be >= 1.");
	if (end < start) return Result.err("End line must be >= start line.");

	const lines = allLines.slice(start - 1, end);
	return Result.ok({ name, lines, start, end: Math.min(end, total), total });
}

export function updateScreenLines({
	name,
	start,
	end,
	content,
	cwd = process.cwd(),
}: {
	name: string;
	start: number;
	end: number;
	content: string;
	cwd?: string;
}): Result<void, string> {
	if (!validateScreenName(name)) {
		return Result.err("Invalid screen name.");
	}
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (!existsSync(filePath)) {
		return Result.err(`Screen "${name}" not found.`);
	}

	const existingContent = readFileSync(filePath, "utf-8");
	const allLines = existingContent.split("\n");
	const total = allLines.length;

	if (start < 1) return Result.err("Start line must be >= 1.");
	if (end < start) return Result.err("End line must be >= start line.");
	if (start > total)
		return Result.err(`Start line ${start} exceeds file length (${total}).`);

	const clampedEnd = Math.min(end, total);
	const newLines = content.split("\n");
	const before = allLines.slice(0, start - 1);
	const after = allLines.slice(clampedEnd);
	const joined = [...before, ...newLines, ...after].join("\n");

	try {
		writeFileSync(filePath, joined);
		return Result.ok(undefined);
	} catch (error) {
		return Result.err(error instanceof Error ? error.message : String(error));
	}
}

export function createScreen({
	name,
	html,
	cwd = process.cwd(),
}: {
	name: string;
	html: string;
	cwd?: string;
}): Result<void, Error> {
	if (!validateScreenName(name)) {
		return Result.err(
			new Error("Invalid screen name. Use kebab-case, no path separators."),
		);
	}
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (existsSync(filePath)) {
		return Result.err(new Error(`Screen "${name}" already exists.`));
	}
	return Result.try(() => writeFileSync(filePath, html));
}

export function updateScreen({
	name,
	html,
	cwd = process.cwd(),
}: {
	name: string;
	html: string;
	cwd?: string;
}): Result<void, Error> {
	if (!validateScreenName(name)) {
		return Result.err(
			new Error("Invalid screen name. Use kebab-case, no path separators."),
		);
	}
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (!existsSync(filePath)) {
		return Result.err(new Error(`Screen "${name}" does not exist.`));
	}
	return Result.try(() => writeFileSync(filePath, html));
}

export function deleteScreen({
	name,
	cwd = process.cwd(),
}: {
	name: string;
	cwd?: string;
}): Result<void, Error> {
	if (!validateScreenName(name)) {
		return Result.err(
			new Error("Invalid screen name. Use kebab-case, no path separators."),
		);
	}
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (!existsSync(filePath)) {
		return Result.err(new Error(`Screen "${name}" does not exist.`));
	}
	return Result.try(() => unlinkSync(filePath));
}

export function renameScreen({
	oldName,
	newName,
	cwd = process.cwd(),
}: {
	oldName: string;
	newName: string;
	cwd?: string;
}): Result<void, Error> {
	if (!validateScreenName(oldName) || !validateScreenName(newName)) {
		return Result.err(
			new Error("Invalid screen name. Use kebab-case, no path separators."),
		);
	}
	const oldPath = join(getScreensDir(cwd), `${oldName}.html`);
	const newPath = join(getScreensDir(cwd), `${newName}.html`);
	if (!existsSync(oldPath)) {
		return Result.err(new Error(`Screen "${oldName}" does not exist.`));
	}
	if (existsSync(newPath)) {
		return Result.err(new Error(`Screen "${newName}" already exists.`));
	}
	return Result.try(() => renameSync(oldPath, newPath));
}

export function renameScreenWithLinks({
	from,
	to,
	updateLinks,
	cwd = process.cwd(),
}: {
	from: string;
	to: string;
	updateLinks: boolean;
	cwd?: string;
}): Result<
	{ renamed: boolean; links_updated: { screen_name: string; count: number }[] },
	Error
> {
	if (!validateScreenName(from) || !validateScreenName(to)) {
		return Result.err(
			new Error("Invalid screen name. Use kebab-case, no path separators."),
		);
	}
	const screensDir = getScreensDir(cwd);
	const oldPath = join(screensDir, `${from}.html`);
	const newPath = join(screensDir, `${to}.html`);
	if (!existsSync(oldPath)) {
		return Result.err(new Error(`Screen "${from}" does not exist.`));
	}
	if (existsSync(newPath)) {
		return Result.err(new Error(`Screen "${to}" already exists.`));
	}

	const linksUpdated: { screen_name: string; count: number }[] = [];
	const pending: { path: string; content: string }[] = [];

	if (updateLinks) {
		const escaped = from.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
		const hrefRe = new RegExp(`href="((?:/p/)?)${escaped}(/?)"`, "g");
		const files = readdirSync(screensDir).filter(
			(file) => file.endsWith(".html") && file !== `${from}.html`,
		);
		for (const file of files) {
			const filePath = join(screensDir, file);
			const content = readFileSync(filePath, "utf-8");
			let count = 0;
			const next = content.replace(hrefRe, (_match, prefix, trailing) => {
				count++;
				return `href="${prefix}${to}${trailing}"`;
			});
			if (count > 0) {
				pending.push({ path: filePath, content: next });
				linksUpdated.push({ screen_name: file.replace(/\.html$/, ""), count });
			}
		}
	}

	try {
		renameSync(oldPath, newPath);
		for (const pendingFile of pending) {
			writeFileSync(pendingFile.path, pendingFile.content);
		}
	} catch (error) {
		return Result.err(error instanceof Error ? error : new Error(String(error)));
	}
	return Result.ok({ renamed: true, links_updated: linksUpdated });
}

export function getConventions({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	const designDir = getDesignDir(cwd);
	const designMdPath = join(designDir, "design.md");
	const componentsPath = join(designDir, "components.html");
	const layoutPath = join(designDir, "layout.html");

	let result = "";
	if (existsSync(designMdPath)) {
		result += readFileSync(designMdPath, "utf-8");
	}
	result += "\n\n---\n\n";
	if (existsSync(componentsPath)) {
		result += readFileSync(componentsPath, "utf-8");
	}
	result +=
		"\n\n---\n\n## Layout\n\nThe layout template wraps all screens. Write only the body content:\n\n";
	if (existsSync(layoutPath)) {
		result += readFileSync(layoutPath, "utf-8");
	} else {
		result += DEFAULT_LAYOUT_HTML;
	}
	return result;
}

export function getDesignMd({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	const filePath = join(getDesignDir(cwd), "design.md");
	if (!existsSync(filePath)) return "";
	return readFileSync(filePath, "utf-8");
}

export function writeDesignMd({
	content,
	cwd = process.cwd(),
}: {
	content: string;
	cwd?: string;
}): Result<void, Error> {
	const filePath = join(getDesignDir(cwd), "design.md");
	return Result.try(() => writeFileSync(filePath, content));
}

export function getComponentsHtml({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	const filePath = join(getDesignDir(cwd), "components.html");
	if (!existsSync(filePath)) return "";
	return readFileSync(filePath, "utf-8");
}

export function writeComponentsHtml({
	content,
	cwd = process.cwd(),
}: {
	content: string;
	cwd?: string;
}): Result<void, Error> {
	const filePath = join(getDesignDir(cwd), "components.html");
	return Result.try(() => writeFileSync(filePath, content));
}

export function getLayoutHtml({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	const filePath = join(getDesignDir(cwd), "layout.html");
	if (!existsSync(filePath)) return DEFAULT_LAYOUT_HTML;
	return readFileSync(filePath, "utf-8");
}

export function writeLayoutHtml({
	content,
	cwd = process.cwd(),
}: {
	content: string;
	cwd?: string;
}): Result<void, Error> {
	const filePath = join(getDesignDir(cwd), "layout.html");
	return Result.try(() => writeFileSync(filePath, content));
}

export function getDesignFilePath({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	return join(getDesignDir(cwd), "design.md");
}

export function getComponentsFilePath({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	return join(getDesignDir(cwd), "components.html");
}

export function getLayoutFilePath({ cwd = process.cwd() }: { cwd?: string } = {}): string {
	return join(getDesignDir(cwd), "layout.html");
}

export function getScreenFilePath({
	name,
	cwd = process.cwd(),
}: {
	name: string;
	cwd?: string;
}): string {
	return join(getScreensDir(cwd), `${name}.html`);
}
