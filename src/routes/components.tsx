import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { componentsHtmlQueryOptions } from "#/server/queries";

type ParsedBlock = {
  name: string;
  variant?: string;
  props: string[];
  slots: string[];
  html: string;
};

function parseMarkerAttrs(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2] ?? m[3];
  }
  return attrs;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseComponentsHtml(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const re = /<!-- ([a-zA-Z][\w-]*):start(.*?) -->([\s\S]*?)<!-- \1:end -->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const attrs = parseMarkerAttrs(m[2].trim());
    blocks.push({
      name: m[1],
      variant: attrs.variant,
      props: splitList(attrs.props),
      slots: splitList(attrs.slots),
      html: m[3].trim(),
    });
  }
  return blocks;
}

export const Route = createFileRoute("/components")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(componentsHtmlQueryOptions());
  },
  component: ComponentsPreview,
});

function ComponentBlock({ block }: { block: ParsedBlock }) {
  const title = block.variant ? `${block.name} · ${block.variant}` : block.name;
  const src = block.variant
    ? `/c/${block.name}?variant=${encodeURIComponent(block.variant)}`
    : `/c/${block.name}`;
  const propSummary = [
    block.props.length > 0 ? `props: ${block.props.join(", ")}` : "",
    block.slots.length > 0 ? `slots: ${block.slots.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("  ");

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        {propSummary && (
          <span className="text-xs text-zinc-400 font-mono">{propSummary}</span>
        )}
      </div>
      <div className="border border-zinc-200 rounded bg-white overflow-hidden">
        <iframe
          src={src}
          title={title}
          className="w-full h-48 border-0 border-b border-zinc-200 bg-white"
        />
        <pre className="p-4 text-xs bg-zinc-950 text-zinc-100 overflow-x-auto">
          {block.html}
        </pre>
      </div>
    </section>
  );
}

function ComponentsPreview() {
  const { data: content = "" } = useQuery(componentsHtmlQueryOptions());
  const blocks = parseComponentsHtml(content);

  return (
    <div className="min-h-screen">
      <div className="flex items-center px-4 py-2 border-b border-zinc-200 bg-white text-sm">
        <Link to="/" className="text-zinc-400 hover:text-zinc-600">
          Canvas
        </Link>
        <ChevronRight size={14} className="text-zinc-300 mx-2" />
        <span className="text-zinc-900 font-medium">Components</span>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Component Library
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Rendered live from{" "}
            <code className="px-1 py-0.5 rounded bg-zinc-100 text-xs">
              .draftboard/components.html
            </code>
            . Edit that file (or use MCP) to add or change components.
          </p>
        </header>

        {blocks.length === 0 ? (
          <div className="border border-dashed border-zinc-200 rounded p-10 text-center text-sm text-zinc-500">
            No components found in components.html.
          </div>
        ) : (
          blocks.map((block, i) => (
            <ComponentBlock
              key={`${block.name}-${block.variant ?? "default"}-${i}`}
              block={block}
            />
          ))
        )}
      </div>
    </div>
  );
}
