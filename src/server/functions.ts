import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";
import { listScreens, getScreen, createScreen, updateScreen, deleteScreen, renameScreen, getDesignMd, getComponentsHtml, writeDesignMd, writeComponentsHtml } from "./fs";
import { validateScreenName } from "./validation";

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
  .handler(async ({ data }): Promise<Result<void, Error>> => {
    return createScreen(data.name, data.html ?? "");
  });

export const updateScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; html: string }) => data)
  .handler(async ({ data }): Promise<Result<void, Error>> => {
    return updateScreen(data.name, data.html);
  });

export const deleteScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }): Promise<Result<void, Error>> => {
    return deleteScreen(data.name);
  });

export const renameScreenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { oldName: string; newName: string }) => data)
  .handler(async ({ data }): Promise<Result<void, Error>> => {
    return renameScreen(data.oldName, data.newName);
  });

export const fetchDesignMd = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return getDesignMd();
});

export const saveDesignMd = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<Result<void, Error>> => {
    return writeDesignMd(data.content);
  });

export const fetchComponentsHtml = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return getComponentsHtml();
});

export const saveComponentsHtml = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }): Promise<Result<void, Error>> => {
    return writeComponentsHtml(data.content);
  });

export function isValidScreenName(name: string): boolean {
  return validateScreenName(name);
}
