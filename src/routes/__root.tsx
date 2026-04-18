import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import Sidebar from "../components/Sidebar";
import { useSSE } from "../hooks/useSSE";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "pi-design" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useSSE();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFullScreen = pathname.startsWith("/s/");

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-mono antialiased bg-white text-zinc-950">
        {!isFullScreen && <Sidebar />}
        <main className={isFullScreen ? "" : "ml-60 min-h-screen"}>{children}</main>
        <Scripts />
      </body>
    </html>
  );
}
