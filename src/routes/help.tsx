import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  LayoutGrid,
  Palette,
  Component,
  Layers,
  FileCode2,
  Terminal,
  FolderTree,
  Plug,
  Edit3,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/help")({
  component: Help,
});

function Help() {
  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 bg-white text-sm">
        <Link to="/" className="text-zinc-400 hover:text-zinc-600 no-underline">
          Canvas
        </Link>
        <ChevronRight size={14} className="text-zinc-300" />
        <span className="text-zinc-900 font-medium">Help</span>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            How to use @butttons/draftboard
          </h1>
          <p className="text-sm text-zinc-600">
            A local wireframing tool. Your files live in <Code>.draftboard/</Code>{" "}
            in the folder where you ran the CLI. Edit them here, in your IDE, or
            via an AI agent through MCP. All three stay in sync.
          </p>
        </header>

        <Section title="The sidebar" icon={LayoutGrid}>
          <Item icon={LayoutGrid} label="Canvas">
            Grid of all your screens with live previews. Click a screen to edit
            it, or use the "New screen" card to create one.
          </Item>
          <Item icon={Palette} label="Design">
            Edit <Code>design.md</Code>. Conventions agents read before
            generating screens: spacing, type, colors, rules.
          </Item>
          <Item icon={Component} label="Components">
            Edit <Code>components.html</Code>. Canonical blocks (button, card,
            nav, etc.) that agents reuse.
          </Item>
          <Item icon={Layers} label="Layout">
            Edit the HTML shell that wraps every preview (Tailwind CDN, icon
            libs, resets). Applied at serve time, never written into your screen
            files.
          </Item>
          <Item icon={FileCode2} label="Screens">
            Every file in <Code>.draftboard/screens/</Code>. Hover a screen to
            reveal the delete button.
          </Item>
        </Section>

        <Section title="Editing a screen" icon={Edit3}>
          <p className="text-sm text-zinc-600">
            The editor is split: Monaco on the left, live iframe preview on the
            right. Drag the divider to resize; your ratio is remembered.
          </p>
          <ul className="text-sm text-zinc-600 space-y-1 list-disc pl-5">
            <li>
              <strong className="text-zinc-900">Auto-save</strong> on blur and{" "}
              <Kbd>Cmd+S</Kbd>.
            </li>
            <li>
              <strong className="text-zinc-900">Rename</strong> by clicking the
              screen name in the top bar.
            </li>
            <li>
              <strong className="text-zinc-900">External changes</strong> (from
              an agent or your IDE) reload the preview automatically. If you
              have unsaved edits, you'll see a "reload?" banner.
            </li>
            <li>
              Open a screen in a clean window at{" "}
              <Code>/p/&lt;screen-name&gt;</Code>.
            </li>
          </ul>
        </Section>

        <Section title="Connecting an AI agent" icon={Plug}>
          <p className="text-sm text-zinc-600">
            The app exposes an MCP server at <Code>/mcp</Code>. Add it to your
            agent's MCP config:
          </p>
          <pre className="text-xs bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
            {`{
  "mcpServers": {
    "draftboard": { "url": "http://localhost:<port>/mcp" }
  }
}`}
          </pre>
          <p className="text-sm text-zinc-600">
            The CLI prints the exact snippet for the current port when it
            starts. Tools available to the agent: <Code>list_screens</Code>,{" "}
            <Code>get_screen</Code>, <Code>create_screen</Code>,{" "}
            <Code>update_screen</Code>, <Code>delete_screen</Code>,{" "}
            <Code>get_conventions</Code>.
          </p>
        </Section>

        <Section title="CLI" icon={Terminal}>
          <p className="text-sm text-zinc-600">Run in any project folder:</p>
          <pre className="text-xs bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
            {`npx @butttons/draftboard              # auto-pick a free port starting at 4321
npx @butttons/draftboard --port 5005  # pin a port
npx @butttons/draftboard --dir .mydir # custom directory
DRAFTBOARD_DIR=.mydir npx @butttons/draftboard # or via env var
npx @butttons/draftboard --open       # open the browser on start`}
          </pre>
        </Section>

        <Section title="Where your work lives" icon={FolderTree}>
          <pre className="text-xs bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
            {`<your-project>/
└── .draftboard/
    ├── design.md
    ├── components.html
    ├── layout.html
    └── screens/
        └── *.html`}
          </pre>
          <p className="text-sm text-zinc-600">
            Plain files. No database. Commit them to git, open them in any
            editor, delete the package any time — your work is untouched.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-950">
        <Icon size={18} className="text-zinc-500" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Item({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 mb-1">
        <Icon size={14} className="text-zinc-500" />
        {label}
      </div>
      <div className="text-sm text-zinc-600 pl-6">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-xs">
      {children}
    </code>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-xs">
      {children}
    </kbd>
  );
}
