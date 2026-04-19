import { createFileRoute } from "@tanstack/react-router";
import { generateComponentPreviewHtml } from "#/server/preview";

export const Route = createFileRoute("/c/$name")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const url = new URL(request.url);
				const variant = url.searchParams.get("variant") ?? undefined;
				const html = generateComponentPreviewHtml({
					name: params.name,
					variant,
				});
				return new Response(html, {
					headers: { "Content-Type": "text/html" },
				});
			},
		},
	},
});
