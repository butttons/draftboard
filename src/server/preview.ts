import { getScreen } from "./fs";
import { getComponent, renderComponent } from "./components";

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
          var data = JSON.parse(ev.data);
          if (data.type === 'screen_changed' && data.name === name) {
            window.location.reload();
          }
        } catch(error) {}
      };
    })();
  </script>
</body>
</html>`;

export function generatePreviewHtml({ screenName }: { screenName: string }): string {
	const screen = getScreen({ name: screenName });
	if (!screen) {
		return buildErrorHtml({ name: screenName });
	}

	const content = screen.html.trim();
	return LIGHTWEIGHT_LAYOUT.replace("{{content}}", content);
}

export function generateLivePreviewHtml({ screenName }: { screenName: string }): string {
	const screen = getScreen({ name: screenName });
	if (!screen) {
		return buildErrorHtml({ name: screenName });
	}

	const content = screen.html.trim();
	return LIVE_LAYOUT.replace("{{content}}", content);
}

const COMPONENT_LAYOUT = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/lib/tailwind.js"></script>
  <script src="/lib/lucide.js"></script>
  <style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:system-ui,-apple-system,sans-serif}body{padding:24px;display:flex;align-items:flex-start;justify-content:flex-start}</style>
</head>
<body>
  {{content}}
  <script>
    if (window.lucide) lucide.createIcons();
    var es = new EventSource('/sse');
    es.onmessage = function(ev) {
      try {
        var data = JSON.parse(ev.data);
        if (data.type === 'components_changed') window.location.reload();
      } catch(error) {}
    };
  </script>
</body>
</html>`;

export function generateComponentPreviewHtml({
	name,
	variant,
}: {
	name: string;
	variant?: string;
}): string {
	const component = getComponent({ name, variant });
	if (!component) {
		return buildErrorHtml({ name: variant ? `${name}:${variant}` : name });
	}
	const sampleProps: Record<string, string> = {};
	for (const prop of component.props) sampleProps[prop] = prop;
	const content = renderComponent({ component, props: sampleProps });
	return COMPONENT_LAYOUT.replace("{{content}}", content);
}

function buildErrorHtml({ name }: { name: string }): string {
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
