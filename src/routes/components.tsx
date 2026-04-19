import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { componentsHtmlQueryOptions } from "#/server/queries";

export const Route = createFileRoute("/components")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(componentsHtmlQueryOptions());
  },
  component: ComponentsPreview,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
      <div className="border border-zinc-200 rounded bg-white">
        {children}
      </div>
    </section>
  );
}

function Preview({ html }: { html: string }) {
  return (
    <div className="p-6 border-b border-zinc-200" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="p-4 text-xs bg-zinc-950 text-zinc-100 overflow-x-auto">
      {children}
    </pre>
  );
}

function ComponentsPreview() {
  useQuery(componentsHtmlQueryOptions());

  // Parse components from the HTML file
  const sections = [
    {
      title: "Buttons",
      html: `<div class="flex gap-4"><button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded hover:bg-zinc-800 transition">Primary</button><button class="border border-zinc-200 text-zinc-700 px-4 py-2 text-sm font-medium rounded hover:bg-zinc-50 transition">Secondary</button></div>`,
      code: `<button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded hover:bg-zinc-800 transition">
  Button
</button>

<button class="border border-zinc-200 text-zinc-700 px-4 py-2 text-sm font-medium rounded hover:bg-zinc-50 transition">
  Button
</button>`,
    },
    {
      title: "Input",
      html: `<input type="text" placeholder="Enter your name..." class="w-full max-w-sm border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" />`,
      code: `<input type="text" placeholder="Enter text..." class="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" />`,
    },
    {
      title: "Card",
      html: `<div class="max-w-sm border border-zinc-200 rounded bg-white overflow-hidden">
  <div class="px-4 py-3 border-b border-zinc-200"><h3 class="text-sm font-semibold">Card Title</h3></div>
  <div class="p-4"><p class="text-sm text-zinc-600">Card content goes here.</p></div>
  <div class="px-4 py-3 border-t border-zinc-200 bg-zinc-50"><button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Action</button></div>
</div>`,
      code: `<div class="border border-zinc-200 rounded bg-white overflow-hidden">
  <div class="px-4 py-3 border-b border-zinc-200">
    <h3 class="text-sm font-semibold">Card Title</h3>
  </div>
  <div class="p-4">
    <p class="text-sm text-zinc-600">Card content goes here.</p>
  </div>
  <div class="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
    <button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Action</button>
  </div>
</div>`,
    },
    {
      title: "Empty State",
      html: `<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded bg-zinc-100 flex items-center justify-center mb-4"><span class="text-zinc-400 text-xl">+</span></div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">No items yet</h3>
  <p class="text-sm text-zinc-600 mb-4">Get started by creating your first item.</p>
  <button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Create</button>
</div>`,
      code: `<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="w-12 h-12 rounded bg-zinc-100 flex items-center justify-center mb-4">
    <span class="text-zinc-400 text-xl">+</span>
  </div>
  <h3 class="text-base font-semibold text-zinc-900 mb-1">No items yet</h3>
  <p class="text-sm text-zinc-600 mb-4">Get started by creating your first item.</p>
  <button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Create</button>
</div>`,
    },
    {
      title: "Row",
      html: `<div class="border border-zinc-200 rounded overflow-hidden">
  <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 hover:bg-zinc-50 transition">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center"><span class="text-sm font-medium text-zinc-600">JD</span></div>
      <div><p class="text-sm font-medium text-zinc-900">John Doe</p><p class="text-sm text-zinc-500">john@example.com</p></div>
    </div>
    <span class="text-sm text-zinc-400">2h ago</span>
  </div>
  <div class="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center"><span class="text-sm font-medium text-zinc-600">AB</span></div>
      <div><p class="text-sm font-medium text-zinc-900">Alice Brown</p><p class="text-sm text-zinc-500">alice@example.com</p></div>
    </div>
    <span class="text-sm text-zinc-400">1d ago</span>
  </div>
</div>`,
      code: `<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 hover:bg-zinc-50 transition">
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
</div>`,
    },
    {
      title: "Badge",
      html: `<div class="flex gap-2">
  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">Default</span>
  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Pending</span>
  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">Error</span>
</div>`,
      code: `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">Default</span>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Pending</span>
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">Error</span>`,
    },
    {
      title: "Avatar",
      html: `<div class="flex gap-4 items-center">
  <div class="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600">SM</div>
  <div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">MD</div>
  <div class="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-base font-medium text-zinc-600">LG</div>
</div>`,
      code: `<div class="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600">SM</div>
<div class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">MD</div>
<div class="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-base font-medium text-zinc-600">LG</div>`,
    },
    {
      title: "Form Field",
      html: `<div class="max-w-sm space-y-1">
  <label class="block text-sm font-medium text-zinc-900">Email</label>
  <input type="text" placeholder="you@example.com" class="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" />
  <p class="text-sm text-zinc-400">We'll never share your email.</p>
</div>`,
      code: `<div class="space-y-1">
  <label class="block text-sm font-medium text-zinc-900">Email</label>
  <input type="text" placeholder="you@example.com" class="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950" />
  <p class="text-sm text-zinc-400">Helper text</p>
</div>`,
    },
    {
      title: "Navigation",
      html: `<nav class="border border-zinc-200 rounded bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">My App</span>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Home</a>
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">About</a>
    </div>
  </div>
</nav>`,
      code: `<nav class="border-b border-zinc-200 bg-white px-6 py-3">
  <div class="flex items-center justify-between">
    <span class="text-lg font-semibold text-zinc-900">Logo</span>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">Home</a>
      <a href="#" class="text-sm text-zinc-600 hover:text-zinc-900">About</a>
    </div>
  </div>
</nav>`,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="flex items-center px-4 py-2 border-b border-zinc-200 bg-white text-sm">
        <Link to="/" className="text-zinc-400 hover:text-zinc-600">Canvas</Link>
        <ChevronRight size={14} className="text-zinc-300 mx-2" />
        <span className="text-zinc-900 font-medium">Components</span>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Component Library</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Copy-paste these snippets into your screens. Edit{" "}
            <code className="px-1 py-0.5 rounded bg-zinc-100 text-xs">.pi/design/components.html</code>{" "}
            to customize.
          </p>
        </header>

        {sections.map((section) => (
          <Section key={section.title} title={section.title}>
            <Preview html={section.html} />
            <Code>{section.code}</Code>
          </Section>
        ))}
      </div>
    </div>
  );
}
