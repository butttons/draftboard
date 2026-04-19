import { type Component } from "../components";

export function buildConventionsResponse(
	conventions: string,
	components: Component[],
): string {
	const componentList = components
		.map((c) => {
			const variant = c.variant ? `:${c.variant}` : "";
			const props = Object.keys(c.props)
				.filter((k) => k !== "variant")
				.join(", ");
			const slots = c.slots.join(", ");
			let desc = `- **${c.name}**${variant}`;
			if (props) desc += ` (props: ${props})`;
			if (slots) desc += ` (slots: ${slots})`;
			return desc;
		})
		.join("\n");

	return `## HOW TO BUILD SCREENS

1. Use the components from the COMPONENTS section below.
2. WRAP each component with markers for easy identification:
   \`<!-- name:start props --> ... <!-- name:end -->\`
3. Follow the DESIGN CONVENTIONS for spacing, colors, and typography.

## MARKER FORMAT (REQUIRED)

Every component in your screen MUST be wrapped with markers:

\`\`\`html
<!-- button:start label="Save" variant=primary -->
<button class="bg-zinc-950 text-white px-4 py-2 text-sm font-medium rounded">Save</button>
<!-- button:end -->

<!-- card:start title="My Card" -->
<div class="border border-zinc-200 rounded bg-white overflow-hidden">
  ...
</div>
<!-- card:end -->
\`\`\`

This allows the AI to find and update specific components later using update_screen with start/end lines.

## LINKING BETWEEN SCREENS

Use relative paths to link between screens:
\`<a href="other-screen-name">Go to other screen</a>\`

From \`/p/profile\`, this links to \`/p/other-screen-name\`. Use list_screens to see existing screens.

## AVAILABLE COMPONENTS

${componentList}

Use list_components and get_component(name) for full HTML snippets.

---

${conventions}`;
}
