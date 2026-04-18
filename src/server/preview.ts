import { getScreen } from "./fs";

const INJECT_HEAD = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
</style>
`;

const INJECT_SCRIPT = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.lucide) lucide.createIcons();
  });
</script>
`;

export function generatePreviewHtml(screenName: string): string {
  const screen = getScreen(screenName);
  if (!screen) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: system-ui; color: #71717a; }
  </style>
</head>
<body>
  <p>Screen "${screenName}" not found</p>
</body>
</html>`;
  }

  let html = screen.html.trim();

  // If the HTML already contains a full document structure, inject into it
  if (html.includes("<!doctype") || html.includes("<!DOCTYPE") || html.includes("<html")) {
    // Inject Tailwind and Lucide into head
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${INJECT_HEAD}</head>`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${INJECT_HEAD}`);
    } else {
      // No head tag, add one
      html = html.replace(/<html[^>]*>/i, `$&<head>${INJECT_HEAD}</head>`);
    }

    // Inject Lucide init script before closing body
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${INJECT_SCRIPT}</body>`);
    }

    return html;
  }

  // Wrap fragment HTML in a full document
  return `<!doctype html>
<html>
<head>
${INJECT_HEAD}
</head>
<body>
${html}
${INJECT_SCRIPT}
</body>
</html>`;
}
