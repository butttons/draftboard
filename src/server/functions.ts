import { createServerFn } from "@tanstack/react-start";
import {
  listScreens,
  getScreen,
  createScreen,
  updateScreen,
  deleteScreen,
  renameScreen,
  getDesignMd,
  getComponentsHtml,
  getLayoutHtml,
  writeDesignMd,
  writeComponentsHtml,
  writeLayoutHtml,
} from "./fs";
import { validateScreenName } from "./validation";
import { getRecentActivities, type McpActivity } from "./mcp/activity";

export type Screen = {
  name: string;
  path: string;
  updated_at: string;
};

export const fetchScreens = createServerFn({ method: "GET" }).handler(
  async (): Promise<Screen[]> => {
    return listScreens();
  },
);

export const fetchScreen = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string }) => data)
  .handler(
    async ({ data }): Promise<{ name: string; html: string } | null> => {
      return getScreen({ name: data.name });
    },
  );

export const createScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; html?: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = createScreen({ name: data.name, html: data.html ?? "" });
    if (result.isErr()) {
      throw new Error(`Failed to create screen "${data.name}": ${result.error.message}`);
    }
  });

export const updateScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; html: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = updateScreen({ name: data.name, html: data.html });
    if (result.isErr()) {
      throw new Error(`Failed to update screen "${data.name}": ${result.error.message}`);
    }
  });

export const deleteScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = deleteScreen({ name: data.name });
    if (result.isErr()) {
      throw new Error(`Failed to delete screen "${data.name}": ${result.error.message}`);
    }
  });

export const renameScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { oldName: string; newName: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = renameScreen({ oldName: data.oldName, newName: data.newName });
    if (result.isErr()) {
      throw new Error(`Failed to rename screen "${data.oldName}" to "${data.newName}": ${result.error.message}`);
    }
  });

export const fetchDesignMd = createServerFn({ method: "GET" }).handler(
  async (): Promise<string> => {
    return getDesignMd();
  },
);

export const saveDesignMd = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = writeDesignMd({ content: data.content });
    if (result.isErr()) {
      throw new Error(`Failed to save design.md: ${result.error.message}`);
    }
  });

export const fetchComponentsHtml = createServerFn({ method: "GET" }).handler(
  async (): Promise<string> => {
    return getComponentsHtml();
  },
);

export const saveComponentsHtml = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = writeComponentsHtml({ content: data.content });
    if (result.isErr()) {
      throw new Error(`Failed to save components.html: ${result.error.message}`);
    }
  });

export const fetchLayoutHtml = createServerFn({ method: "GET" }).handler(
  async (): Promise<string> => {
    return getLayoutHtml();
  },
);

export const saveLayoutHtml = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const result = writeLayoutHtml({ content: data.content });
    if (result.isErr()) {
      throw new Error(`Failed to save layout.html: ${result.error.message}`);
    }
  });

export function isValidScreenName(name: string): boolean {
  return validateScreenName(name);
}

export const fetchMcpActivities = createServerFn({ method: "GET" }).handler(
  async (): Promise<McpActivity[]> => {
    return getRecentActivities();
  },
);
