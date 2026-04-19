import { getScreen, getLayoutHtml } from "./fs";

const LIGHTWEIGHT_LAYOUT = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/lib/tailwind.js"></script>
  <script src="/lib/lucide.js"></script>
  <style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
  {{content}}
  <script>
    if (window.lucide) lucide.createIcons();
  </script>
</body>
</html>`;

const LIVE_LAYOUT = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/lib/tailwind.js"></script>
  <script src="/lib/lucide.js"></script>
  <style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
  {{content}}
  <script>
    if (window.lucide) lucide.createIcons();
    (function() {
      var name = window.location.pathname.split('/').pop();
      var es = new EventSource('/sse');
      es.onmessage = function(ev) {
        try {
          var d = JSON.parse(ev.data);
          if (d.type === 'screen_changed' && d.name === name) {
            window.location.reload();
          }
        } catch(e) {}
      };
    })();
  </script>
</body>
</html>`;

export function generatePreviewHtml(screenName: string): string {
  const screen = getScreen(screenName);
  if (!screen) {
    return errorHtml(screenName);
  }

  const content = screen.html.trim();
  return LIGHTWEIGHT_LAYOUT.replace("{{content}}", content);
}

export function generateLivePreviewHtml(screenName: string): string {
  const screen = getScreen(screenName);
  if (!screen) {
    return errorHtml(screenName);
  }

  const content = screen.html.trim();
  return LIVE_LAYOUT.replace("{{content}}", content);
}

function errorHtml(name: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: system-ui; color: #71717a; }
  </style>
</head>
<body>
  <p>Screen "${name}" not found</p>
</body>
</html>`;
}
