import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { McpActivity } from "#/server/mcp-activity";

export function useSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource("/sse");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "screen_changed":
            queryClient.invalidateQueries({ queryKey: ["screens"] });
            queryClient.invalidateQueries({ queryKey: ["screen", data.name] });
            break;
          case "design_changed":
            queryClient.invalidateQueries({ queryKey: ["designMd"] });
            break;
          case "components_changed":
            queryClient.invalidateQueries({ queryKey: ["componentsHtml"] });
            break;
          case "layout_changed":
            queryClient.invalidateQueries({ queryKey: ["layoutHtml"] });
            break;
          case "mcp_activity":
            queryClient.setQueryData<McpActivity[]>(
              ["mcpActivities"],
              (prev = []) => [data.activity, ...prev].slice(0, 50),
            );
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  }, [queryClient]);
}
