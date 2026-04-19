export const DEFAULT_DESIGN_MD = `# Design Conventions

## Preview
- Screens are viewable at \`/p/<screen-name>\`

## Spacing
- Use only: \`p-2\` \`p-4\` \`p-6\` \`p-8\`
- Gap: \`gap-2\` \`gap-4\` \`gap-6\`

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
- Shadow: \`shadow-sm\` maximum

## Icons
- Use Lucide icons only

## Rules
- No gradients
- Keep it simple and clean
`;

export const DEFAULT_COMPONENTS_HTML = `<!-- button:start variant="primary" props="label" -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">{{label}}</button>
<!-- button:end -->

<!-- button:start variant="secondary" props="label" -->
<button class="border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition">{{label}}</button>
<!-- button:end -->

<!-- input:start props="placeholder" -->
<input type="text" placeholder="{{placeholder}}" class="border border-zinc-200 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"/>
<!-- input:end -->

<!-- card:start props="title" slots="content" -->
<div class="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden">
  <div class="px-4 py-3 border-b border-zinc-200">
    <h3 class="text-base font-semibold text-zinc-900">{{title}}</h3>
  </div>
  <div class="p-4">
    <!-- slot:content -->
  </div>
</div>
<!-- card:end -->

<!-- nav:start props="brand" slots="links" -->
<nav class="border-b border-zinc-200 bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">{{brand}}</span>
    <div class="flex items-center gap-4">
      <!-- slot:links -->
    </div>
  </div>
</nav>
<!-- nav:end -->

<!-- empty:start props="title,message" slots="icon,action" -->
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
    <!-- slot:icon -->
  </div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">{{title}}</h3>
  <p class="text-sm text-zinc-600 mb-4">{{message}}</p>
  <!-- slot:action -->
</div>
<!-- empty:end -->

<!-- field:start props="label" slots="input" -->
<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">{{label}}</label>
  <!-- slot:input -->
  <p class="text-sm text-zinc-400">Helper text</p>
</div>
<!-- field:end -->

<!-- row:start props="name,detail" slots="trailing" -->
<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
  <div>
    <p class="text-sm font-medium text-zinc-900">{{name}}</p>
    <p class="text-sm text-zinc-500">{{detail}}</p>
  </div>
  <!-- slot:trailing -->
</div>
<!-- row:end -->

<!-- badge:start variant="default" props="label" -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">{{label}}</span>
<!-- badge:end -->

<!-- avatar:start props="initials" -->
<div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">{{initials}}</div>
<!-- avatar:end -->
`;

export const DEFAULT_LAYOUT_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/lib/tailwind.js"></script>
  <script src="/lib/lucide.js"></script>
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
