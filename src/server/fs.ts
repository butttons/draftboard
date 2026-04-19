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

export function scaffoldDesignDir(cwd: string = process.cwd()): void {
	const designDir = getDesignDir(cwd);
	const screensDir = getScreensDir(cwd);

	if (!existsSync(designDir)) {
		mkdirSync(designDir, { recursive: true });
	}
	if (!existsSync(screensDir)) {
		mkdirSync(screensDir, { recursive: true });
	}

	const designMdPath = join(designDir, "design.md");
	if (!existsSync(designMdPath)) {
		writeFileSync(designMdPath, DEFAULT_DESIGN_MD);
	}

	const componentsPath = join(designDir, "components.html");
	if (!existsSync(componentsPath)) {
		writeFileSync(componentsPath, DEFAULT_COMPONENTS_HTML);
	}

	const layoutPath = join(designDir, "layout.html");
	if (!existsSync(layoutPath)) {
		writeFileSync(layoutPath, DEFAULT_LAYOUT_HTML);
	}
}

export function listScreens(cwd: string = process.cwd()): Screen[] {
	const screensDir = getScreensDir(cwd);
	if (!existsSync(screensDir)) return [];

	const files = readdirSync(screensDir).filter((f) => f.endsWith(".html"));
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

export function getScreen(
	name: string,
	cwd: string = process.cwd(),
): { name: string; html: string } | null {
	if (!validateScreenName(name)) return null;
	const filePath = join(getScreensDir(cwd), `${name}.html`);
	if (!existsSync(filePath)) return null;
	return { name, html: readFileSync(filePath, "utf-8") };
}

export function getScreenLines(
	name: string,
	start: number,
	end: number,
	cwd: string = process.cwd(),
): Result<
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

export function updateScreenLines(
	name: string,
	start: number,
	end: number,
	content: string,
	cwd: string = process.cwd(),
): Result<void, string> {
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
	} catch (e) {
		return Result.err(e instanceof Error ? e.message : String(e));
	}
}

export function createScreen(
	name: string,
	html: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
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

export function updateScreen(
	name: string,
	html: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
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

export function deleteScreen(
	name: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
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

export function renameScreen(
	oldName: string,
	newName: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
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

export function getConventions(cwd: string = process.cwd()): string {
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

export function getDesignMd(cwd: string = process.cwd()): string {
	const filePath = join(getDesignDir(cwd), "design.md");
	if (!existsSync(filePath)) return "";
	return readFileSync(filePath, "utf-8");
}

export function writeDesignMd(
	content: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
	const filePath = join(getDesignDir(cwd), "design.md");
	return Result.try(() => writeFileSync(filePath, content));
}

export function getComponentsHtml(cwd: string = process.cwd()): string {
	const filePath = join(getDesignDir(cwd), "components.html");
	if (!existsSync(filePath)) return "";
	return readFileSync(filePath, "utf-8");
}

export function writeComponentsHtml(
	content: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
	const filePath = join(getDesignDir(cwd), "components.html");
	return Result.try(() => writeFileSync(filePath, content));
}

export function getLayoutHtml(cwd: string = process.cwd()): string {
	const filePath = join(getDesignDir(cwd), "layout.html");
	if (!existsSync(filePath)) return DEFAULT_LAYOUT_HTML;
	return readFileSync(filePath, "utf-8");
}

export function writeLayoutHtml(
	content: string,
	cwd: string = process.cwd(),
): Result<void, Error> {
	const filePath = join(getDesignDir(cwd), "layout.html");
	return Result.try(() => writeFileSync(filePath, content));
}

export function getDesignFilePath(cwd: string = process.cwd()): string {
	return join(getDesignDir(cwd), "design.md");
}

export function getComponentsFilePath(cwd: string = process.cwd()): string {
	return join(getDesignDir(cwd), "components.html");
}

export function getLayoutFilePath(cwd: string = process.cwd()): string {
	return join(getDesignDir(cwd), "layout.html");
}

export function getScreenFilePath(
	name: string,
	cwd: string = process.cwd(),
): string {
	return join(getScreensDir(cwd), `${name}.html`);
}
