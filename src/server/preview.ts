import { getScreen, getLayoutHtml } from "./fs";

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

  const layout = getLayoutHtml();
  const content = screen.html.trim();

  return layout.replace("{{content}}", content);
}
