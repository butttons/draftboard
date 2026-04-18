import { queryOptions } from "@tanstack/react-query";
import { fetchScreens, fetchScreen, fetchDesignMd, fetchComponentsHtml, fetchLayoutHtml } from "./functions";

export const screensQueryOptions = () =>
  queryOptions({
    queryKey: ["screens"],
    queryFn: () => fetchScreens(),
  });

export const screenQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ["screen", name],
    queryFn: () => fetchScreen({ data: { name } }),
  });

export const designMdQueryOptions = () =>
  queryOptions({
    queryKey: ["designMd"],
    queryFn: () => fetchDesignMd(),
  });

export const componentsHtmlQueryOptions = () =>
  queryOptions({
    queryKey: ["componentsHtml"],
    queryFn: () => fetchComponentsHtml(),
  });

export const layoutHtmlQueryOptions = () =>
  queryOptions({
    queryKey: ["layoutHtml"],
    queryFn: () => fetchLayoutHtml(),
  });
