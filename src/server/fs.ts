import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, renameSync } from "node:fs";
import { join, basename } from "node:path";

const DESIGN_DIR = ".pi/design";
const SCREENS_DIR = "screens";

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
}

export function validateScreenName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
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

export function createScreen(name: string, html: string, cwd: string = process.cwd()): void {
  if (!validateScreenName(name)) {
    throw new Error("Invalid screen name. Use kebab-case, no path separators.");
  }
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (existsSync(filePath)) {
    throw new Error(`Screen "${name}" already exists.`);
  }
  writeFileSync(filePath, html);
}

export function updateScreen(name: string, html: string, cwd: string = process.cwd()): void {
  if (!validateScreenName(name)) {
    throw new Error("Invalid screen name. Use kebab-case, no path separators.");
  }
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (!existsSync(filePath)) {
    throw new Error(`Screen "${name}" does not exist.`);
  }
  writeFileSync(filePath, html);
}

export function deleteScreen(name: string, cwd: string = process.cwd()): void {
  if (!validateScreenName(name)) {
    throw new Error("Invalid screen name. Use kebab-case, no path separators.");
  }
  const filePath = join(getScreensDir(cwd), `${name}.html`);
  if (!existsSync(filePath)) {
    throw new Error(`Screen "${name}" does not exist.`);
  }
  unlinkSync(filePath);
}

export function renameScreen(oldName: string, newName: string, cwd: string = process.cwd()): void {
  if (!validateScreenName(oldName) || !validateScreenName(newName)) {
    throw new Error("Invalid screen name. Use kebab-case, no path separators.");
  }
  const oldPath = join(getScreensDir(cwd), `${oldName}.html`);
  const newPath = join(getScreensDir(cwd), `${newName}.html`);
  if (!existsSync(oldPath)) {
    throw new Error(`Screen "${oldName}" does not exist.`);
  }
  if (existsSync(newPath)) {
    throw new Error(`Screen "${newName}" already exists.`);
  }
  renameSync(oldPath, newPath);
}

export function getConventions(cwd: string = process.cwd()): string {
  const designDir = getDesignDir(cwd);
  const designMdPath = join(designDir, "design.md");
  const componentsPath = join(designDir, "components.html");

  let result = "";
  if (existsSync(designMdPath)) {
    result += readFileSync(designMdPath, "utf-8");
  }
  result += "\n\n---\n\n";
  if (existsSync(componentsPath)) {
    result += readFileSync(componentsPath, "utf-8");
  }
  return result;
}

export function getDesignMd(cwd: string = process.cwd()): string {
  const filePath = join(getDesignDir(cwd), "design.md");
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf-8");
}

export function getComponentsHtml(cwd: string = process.cwd()): string {
  const filePath = join(getDesignDir(cwd), "components.html");
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf-8");
}

export function writeDesignMd(content: string, cwd: string = process.cwd()): void {
  const filePath = join(getDesignDir(cwd), "design.md");
  writeFileSync(filePath, content);
}

export function writeComponentsHtml(content: string, cwd: string = process.cwd()): void {
  const filePath = join(getDesignDir(cwd), "components.html");
  writeFileSync(filePath, content);
}

export function getDesignFilePath(cwd: string = process.cwd()): string {
  return join(getDesignDir(cwd), "design.md");
}

export function getComponentsFilePath(cwd: string = process.cwd()): string {
  return join(getDesignDir(cwd), "components.html");
}

export function getScreenFilePath(name: string, cwd: string = process.cwd()): string {
  return join(getScreensDir(cwd), `${name}.html`);
}

const DEFAULT_DESIGN_MD = `# Design Conventions

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

const DEFAULT_COMPONENTS_HTML = `<!-- Button Primary -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
  Button
</button>

<!-- Button Secondary -->
<button class="border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition">
  Button
</button>

<!-- Input -->
<input
  type="text"
  placeholder="Enter text..."
  class="border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>

<!-- Card -->
<div class="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm">
  <h3 class="text-base font-semibold text-zinc-900 mb-2">Card Title</h3>
  <p class="text-sm text-zinc-600">Card content goes here.</p>
</div>

<!-- Nav Bar -->
<nav class="border-b border-zinc-200 bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">Logo</span>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Link</a>
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Link</a>
    </div>
  </div>
</nav>

<!-- Empty State -->
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
    <span class="text-zinc-400">Icon</span>
  </div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">No items yet</h3>
  <p class="text-sm text-zinc-600 mb-4">Get started by creating your first item.</p>
  <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
    Create
  </button>
</div>

<!-- Table Row -->
<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded-full bg-zinc-200"></div>
    <div>
      <p class="text-sm font-medium text-zinc-900">Name</p>
      <p class="text-sm text-zinc-600">email@example.com</p>
    </div>
  </div>
  <span class="text-sm text-zinc-400">2h ago</span>
</div>

<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-sm">
    <h3 class="text-lg font-semibold text-zinc-900 mb-2">Modal Title</h3>
    <p class="text-sm text-zinc-600 mb-4">Modal content goes here.</p>
    <div class="flex justify-end gap-2">
      <button class="border border-zinc-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
      <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Confirm</button>
    </div>
  </div>
</div>

<!-- Form Field -->
<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">Label</label>
  <input
    type="text"
    placeholder="Placeholder"
    class="w-full border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <p class="text-sm text-zinc-400">Helper text</p>
</div>

<!-- Avatar -->
<div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
  <span class="text-sm font-medium text-zinc-600">JD</span>
</div>

<!-- Badge -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">
  Badge
</span>
`;
