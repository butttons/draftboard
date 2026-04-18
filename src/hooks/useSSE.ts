import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/sse");
    esRef.current = es;

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
