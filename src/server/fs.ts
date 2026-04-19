import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, renameSync } from "node:fs";
import { join } from "node:path";
import { Result } from "better-result";
import { validateScreenName } from "./validation";
import { startWatcher } from "./watcher";

const DESIGN_DIR = ".pi/design";
const SCREENS_DIR = "screens";

// Start file watcher for live updates
if (typeof window === "undefined") {
  startWatcher();
}

export type Screen = {
  name: string;
  path: string;
  updated_at: string;
};

function getDesignDir(cwd: string = process.cwd()): string {
  return join(cwd, DESIGN_DIR);
}

function getScreensDir(cwd: string = process.cwd()): string {
  return join(cwd, DESIGN_DIR, SCREENS_DIR);
}

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

export function getScreen(name: string, cwd: string = process.cwd()): { name: string; html: string } | null {
  if (!validateScreenName(name)) return null;
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (!existsSync(filePath)) return null;
  return { name, html: readFileSync(filePath, "utf-8") };
}

export function getScreenLines(
  name: string,
  start: number,
  end: number,
  cwd: string = process.cwd()
): Result<{ name: string; lines: string[]; start: number; end: number; total: number }, string> {
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
  cwd: string = process.cwd()
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
  if (start > total) return Result.err(`Start line ${start} exceeds file length (${total}).`);

  const clampedEnd = Math.min(end, total);
  const newLines = content.split("\n");
  const before = allLines.slice(0, start - 1);
  const after = allLines.slice(clampedEnd);
  const result = [...before, ...newLines, ...after].join("\n");

  return Result.try(() => writeFileSync(filePath, result));
}

export function createScreen(name: string, html: string, cwd: string = process.cwd()): Result<void, Error> {
  if (!validateScreenName(name)) {
    return Result.err(new Error("Invalid screen name. Use kebab-case, no path separators."));
  }
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (existsSync(filePath)) {
    return Result.err(new Error(`Screen "${name}" already exists.`));
  }
  return Result.try(() => writeFileSync(filePath, html));
}

export function updateScreen(name: string, html: string, cwd: string = process.cwd()): Result<void, Error> {
  if (!validateScreenName(name)) {
    return Result.err(new Error("Invalid screen name. Use kebab-case, no path separators."));
  }
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (!existsSync(filePath)) {
    return Result.err(new Error(`Screen "${name}" does not exist.`));
  }
  return Result.try(() => writeFileSync(filePath, html));
}

export function deleteScreen(name: string, cwd: string = process.cwd()): Result<void, Error> {
  if (!validateScreenName(name)) {
    return Result.err(new Error("Invalid screen name. Use kebab-case, no path separators."));
  }
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (!existsSync(filePath)) {
    return Result.err(new Error(`Screen "${name}" does not exist.`));
  }
  return Result.try(() => unlinkSync(filePath));
}

export function renameScreen(oldName: string, newName: string, cwd: string = process.cwd()): Result<void, Error> {
  if (!validateScreenName(oldName) || !validateScreenName(newName)) {
    return Result.err(new Error("Invalid screen name. Use kebab-case, no path separators."));
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
  result += "\n\n---\n\n## Layout\n\nThe layout template wraps all screens. Write only the body content:\n\n";
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

export function writeDesignMd(content: string, cwd: string = process.cwd()): Result<void, Error> {
  const filePath = join(getDesignDir(cwd), "design.md");
  return Result.try(() => writeFileSync(filePath, content));
}

export function getComponentsHtml(cwd: string = process.cwd()): string {
  const filePath = join(getDesignDir(cwd), "components.html");
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf-8");
}

export function writeComponentsHtml(content: string, cwd: string = process.cwd()): Result<void, Error> {
  const filePath = join(getDesignDir(cwd), "components.html");
  return Result.try(() => writeFileSync(filePath, content));
}

export function getLayoutHtml(cwd: string = process.cwd()): string {
  const filePath = join(getDesignDir(cwd), "layout.html");
  if (!existsSync(filePath)) return DEFAULT_LAYOUT_HTML;
  return readFileSync(filePath, "utf-8");
}

export function writeLayoutHtml(content: string, cwd: string = process.cwd()): Result<void, Error> {
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

export function getScreenFilePath(name: string, cwd: string = process.cwd()): string {
  return join(getScreensDir(cwd), `${name}.html`);
}

const DEFAULT_DESIGN_MD = `# Design Conventions

## Preview
- Screens are viewable at \`/p/<screen-name>\`
- Example: \`/p/login\` shows the login screen

## Spacing
- Use only: \`p-2\` \`p-4\` \`p-6\` \`p-8\`
- Gap: \`gap-2\` \`gap-4\` \`gap-6\`
- Margin: \`m-2\` \`m-4\` \`m-6\`

## Typography
- Sizes: \`text-sm\` \`text-base\` \`text-lg\` \`text-2xl\`
- Headings: semibold, not bold
- Body: \`text-zinc-600\`

## Colors
- Backgrounds: \`bg-white\` \`bg-zinc-50\` \`bg-zinc-100\`
- Text: \`text-zinc-900\` \`text-zinc-600\` \`text-zinc-400\`
- Accent: \`text-blue-600\` \`bg-blue-600\`
- Borders: \`border-zinc-200\`

## Borders & Shadows
- Border: \`border border-zinc-200\`
- Radius: \`rounded-lg\`
- Shadow: \`shadow-sm\` maximum, no larger shadows

## Icons
- Use Lucide icons only

## Rules
- No gradients
- No custom colors outside the zinc + blue palette
- Keep it simple and clean
`;

const DEFAULT_COMPONENTS_HTML = `<!-- COMPONENTS: Copy-paste these into your screens -->

<!-- Button Primary -->
<button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded hover:bg-zinc-800 transition">
  Button
</button>

<!-- Button Secondary -->
<button class="border border-zinc-200 text-zinc-700 px-4 py-2 text-sm font-medium rounded hover:bg-zinc-50 transition">
  Button
</button>

<!-- Input -->
<input type="text" placeholder="Enter text..." class="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" />

<!-- Card -->
<div class="border border-zinc-200 rounded bg-white overflow-hidden">
  <div class="px-4 py-3 border-b border-zinc-200">
    <h3 class="text-sm font-semibold">Card Title</h3>
  </div>
  <div class="p-4">
    <p class="text-sm text-zinc-600">Card content goes here.</p>
  </div>
  <div class="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
    <button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Action</button>
  </div>
</div>

<!-- Empty State -->
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded bg-zinc-100 flex items-center justify-center mb-4">
    <span class="text-zinc-400 text-xl">+</span>
  </div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">No items yet</h3>
  <p class="text-sm text-zinc-600 mb-4">Get started by creating your first item.</p>
  <button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Create</button>
</div>

<!-- Row -->
<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 hover:bg-zinc-50 transition">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
      <span class="text-sm font-medium text-zinc-600">JD</span>
    </div>
    <div>
      <p class="text-sm font-medium text-zinc-900">John Doe</p>
      <p class="text-sm text-zinc-500">john@example.com</p>
    </div>
  </div>
  <span class="text-sm text-zinc-400">2h ago</span>
</div>

<!-- Badge -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">Default</span>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Success</span>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Warning</span>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">Error</span>

<!-- Avatar -->
<div class="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600">SM</div>
<div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">MD</div>
<div class="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-base font-medium text-zinc-600">LG</div>

<!-- Form Field -->
<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">Email</label>
  <input type="text" placeholder="you@example.com" class="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" />
  <p class="text-sm text-zinc-400">Helper text</p>
</div>

<!-- Nav -->
<nav class="border-b border-zinc-200 bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">Logo</span>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Home</a>
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">About</a>
    </div>
  </div>
</nav>
`;

const DEFAULT_LAYOUT_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  {{content}}
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>
`;
