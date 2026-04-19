import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./lib/tanstack-query/root-provider";
import { DefaultPending } from "./components/DefaultPending";

export function getRouter() {
  const context = getContext();

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Show pending UI immediately (no 1s grace), but keep it visible for at
    // least 300ms once shown so fast localhost loaders don't cause a flash.
    defaultPendingMs: 0,
    defaultPendingMinMs: 300,
    defaultPendingComponent: DefaultPending,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
