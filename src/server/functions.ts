import { createServerFn } from "@tanstack/react-start";
import { listScreens, getScreen, createScreen, updateScreen, deleteScreen, renameScreen, getDesignMd, getComponentsHtml, getLayoutHtml, writeDesignMd, writeComponentsHtml, writeLayoutHtml } from "./fs";
import { validateScreenName } from "./validation";
import { getRecentActivities, type McpActivity } from "./mcp/activity";

export type Screen = {
  name: string;
  path: string;
  updated_at: string;
};

export const fetchScreens = createServerFn({ method: "GET" }).handler(async (): Promise<Screen[]> => {
  return listScreens();
});

export const fetchScreen = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }): Promise<{ name: string; html: string } | null> => {
    return getScreen(data.name);
  });

export const createScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; html?: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = createScreen(data.name, data.html ?? "");
    if (result.isErr()) throw result.error;
  });

export const updateScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; html: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = updateScreen(data.name, data.html);
    if (result.isErr()) throw result.error;
  });

export const deleteScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = deleteScreen(data.name);
    if (result.isErr()) throw result.error;
  });

export const renameScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { oldName: string; newName: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = renameScreen(data.oldName, data.newName);
    if (result.isErr()) throw result.error;
  });

export const fetchDesignMd = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return getDesignMd();
});

export const saveDesignMd = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = writeDesignMd(data.content);
    if (result.isErr()) throw result.error;
  });

export const fetchComponentsHtml = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return getComponentsHtml();
});

export const saveComponentsHtml = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = writeComponentsHtml(data.content);
    if (result.isErr()) throw result.error;
  });

export const fetchLayoutHtml = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return getLayoutHtml();
});

export const saveLayoutHtml = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = writeLayoutHtml(data.content);
    if (result.isErr()) throw result.error;
  });

export function isValidScreenName(name: string): boolean {
  return validateScreenName(name);
}

export const fetchMcpActivities = createServerFn({ method: "GET" }).handler(
  async (): Promise<McpActivity[]> => {
    return getRecentActivities();
  },
);
