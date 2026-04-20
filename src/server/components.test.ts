import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	validateComponentInput,
	listComponents,
	upsertComponent,
	deleteComponent,
	getComponent,
	renderComponent,
	extractReferencedProps,
	extractReferencedSlots,
} from "./components";

let cwd: string;

beforeEach(() => {
	cwd = mkdtempSync(join(tmpdir(), "draftboard-test-"));
	mkdirSync(join(cwd, ".draftboard"), { recursive: true });
});

afterEach(() => {
	rmSync(cwd, { recursive: true, force: true });
});

function writeComponents(html: string): void {
	writeFileSync(join(cwd, ".draftboard", "components.html"), html);
}

function readComponents(): string {
	return readFileSync(join(cwd, ".draftboard", "components.html"), "utf-8");
}

describe("validateComponentInput", () => {
	it("rejects same-name start/end markers embedded in html", () => {
		const { errors } = validateComponentInput({
			name: "card",
			html: "<!-- card:start --><div></div><!-- card:end -->",
			props: [],
			slots: [],
		});
		expect(errors.some((message) => message.includes("Do not include"))).toBe(true);
	});

	it("rejects full-document tags", () => {
		for (const tag of ["html", "head", "body", "script"]) {
			const { errors } = validateComponentInput({
				name: "card",
				html: `<${tag}><div></div></${tag}>`,
				props: [],
				slots: [],
			});
			expect(errors.some((message) => message.toLowerCase().includes("fragment"))).toBe(true);
		}
	});

	it("rejects non-kebab-case names", () => {
		for (const bad of ["Card", "info_card", "-card", "card-", "card--x", "1card"]) {
			const { errors } = validateComponentInput({
				name: bad,
				html: "<div/>",
				props: [],
				slots: [],
			});
			expect(errors.some((message) => message.includes("kebab-case"))).toBe(true);
		}
	});

	it("accepts valid kebab-case names", () => {
		for (const ok of ["card", "info-card", "lifecycle-bar-2"]) {
			const { errors } = validateComponentInput({
				name: ok,
				html: "<div/>",
				props: [],
				slots: [],
			});
			expect(errors).toEqual([]);
		}
	});

	it("rejects empty html", () => {
		const { errors } = validateComponentInput({
			name: "card",
			html: "   \n\t",
			props: [],
			slots: [],
		});
		expect(errors.some((message) => message.includes("non-empty"))).toBe(true);
	});

	it("errors on undeclared {{prop}} references", () => {
		const { errors } = validateComponentInput({
			name: "card",
			html: "<p>{{title}}</p>",
			props: [],
			slots: [],
		});
		expect(errors.some((message) => message.includes('"title"') && message.includes("Undeclared prop"))).toBe(true);
	});

	it("errors on undeclared slot references", () => {
		const { errors } = validateComponentInput({
			name: "card",
			html: "<div><!-- slot:body --></div>",
			props: [],
			slots: [],
		});
		expect(errors.some((message) => message.includes('"body"') && message.includes("Undeclared slot"))).toBe(true);
	});

	it("warns (not errors) on declared-but-unused props/slots", () => {
		const { errors, warnings } = validateComponentInput({
			name: "card",
			html: "<p>hi</p>",
			props: ["title", "body"],
			slots: ["footer"],
		});
		expect(errors).toEqual([]);
		expect(warnings.length).toBe(3);
	});

	it("passes cleanly when all props/slots round-trip", () => {
		const { errors, warnings } = validateComponentInput({
			name: "info-card",
			html: "<div><p>{{title}}</p><!-- slot:action --></div>",
			props: ["title"],
			slots: ["action"],
		});
		expect(errors).toEqual([]);
		expect(warnings).toEqual([]);
	});
});

describe("extractReferencedProps / extractReferencedSlots", () => {
	it("dedupes repeated references", () => {
		expect(extractReferencedProps("{{a}} {{a}} {{b}}")).toEqual(["a", "b"]);
		expect(extractReferencedSlots("<!-- slot:x --><!-- slot:x --><!-- slot:y -->")).toEqual(["x", "y"]);
	});

	it("tolerates whitespace inside delimiters", () => {
		expect(extractReferencedProps("{{ title }}")).toEqual(["title"]);
		expect(extractReferencedSlots("<!--  slot:content  -->")).toEqual(["content"]);
	});
});

describe("upsertComponent", () => {
	it("creates a block with server-owned markers (no agent-supplied markers)", () => {
		const result = upsertComponent({
			name: "info-card",
			html: "<div>{{title}}</div>",
			props: ["title"],
			cwd,
		});
		expect(result.isOk()).toBe(true);
		const content = readComponents();
		expect(content).toContain('<!-- info-card:start props="title" -->');
		expect(content).toContain("<!-- info-card:end -->");
		expect(content).toContain("<div>{{title}}</div>");
	});

	it("round-trips via listComponents", () => {
		upsertComponent({
			name: "info-card",
			html: "<div>{{title}}<!-- slot:action --></div>",
			props: ["title"],
			slots: ["action"],
			variant: "primary",
			cwd,
		});
		const list = listComponents({ cwd });
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({
			name: "info-card",
			variant: "primary",
			props: ["title"],
			slots: ["action"],
		});
	});

	it("replaces an existing block keyed by name+variant, not duplicates", () => {
		upsertComponent({ name: "btn", html: "<button>v1</button>", cwd });
		const second = upsertComponent({ name: "btn", html: "<button>v2</button>", cwd });
		expect(second.match({ ok: ({ created }) => created, err: () => null })).toBe(false);
		const list = listComponents({ cwd });
		expect(list).toHaveLength(1);
		expect(list[0].html).toContain("v2");
	});

	it("treats different variants as distinct components", () => {
		upsertComponent({ name: "btn", variant: "primary", html: "<b>p</b>", cwd });
		upsertComponent({ name: "btn", variant: "secondary", html: "<b>s</b>", cwd });
		const list = listComponents({ cwd });
		expect(list).toHaveLength(2);
		expect(list.map((c) => c.variant).sort()).toEqual(["primary", "secondary"]);
	});

	it("returns an error (no write) when validation fails", () => {
		const before = existsSync(join(cwd, ".draftboard", "components.html"));
		const result = upsertComponent({
			name: "card",
			html: "<!-- card:start --><div/><!-- card:end -->",
			cwd,
		});
		expect(result.isErr()).toBe(true);
		const afterExists = existsSync(join(cwd, ".draftboard", "components.html"));
		expect(afterExists).toBe(before);
	});

	it("surfaces validation warnings on success", () => {
		const result = upsertComponent({
			name: "card",
			html: "<p>hi</p>",
			props: ["title"],
			cwd,
		});
		const warnings = result.match({ ok: ({ warnings }) => warnings, err: () => [] });
		expect(warnings.length).toBeGreaterThan(0);
	});
});

describe("deleteComponent", () => {
	it("removes only the targeted variant", () => {
		upsertComponent({ name: "btn", variant: "primary", html: "<b>p</b>", cwd });
		upsertComponent({ name: "btn", variant: "secondary", html: "<b>s</b>", cwd });
		const del = deleteComponent({ name: "btn", variant: "primary", cwd });
		expect(del.isOk()).toBe(true);
		const list = listComponents({ cwd });
		expect(list).toHaveLength(1);
		expect(list[0].variant).toBe("secondary");
	});

	it("errors when the block is missing", () => {
		writeComponents("");
		const del = deleteComponent({ name: "btn", cwd });
		expect(del.isErr()).toBe(true);
	});
});

describe("parseComponents (via listComponents)", () => {
	it("falls back to scanning html when props/slots attrs are missing", () => {
		writeComponents(
			'<!-- legacy:start -->\n<div>{{title}}<!-- slot:x --></div>\n<!-- legacy:end -->',
		);
		const list = listComponents({ cwd });
		expect(list[0].props).toEqual(["title"]);
		expect(list[0].slots).toEqual(["x"]);
	});

	it("prefers declared props/slots over inferred when both exist", () => {
		writeComponents(
			'<!-- card:start props="title,body" slots="footer" -->\n<p>{{title}}</p>\n<!-- card:end -->',
		);
		const list = listComponents({ cwd });
		expect(list[0].props).toEqual(["title", "body"]);
		expect(list[0].slots).toEqual(["footer"]);
	});

	it("returns [] when components.html is absent", () => {
		expect(listComponents({ cwd })).toEqual([]);
	});

	it("resolves getComponent by name+variant", () => {
		upsertComponent({ name: "btn", variant: "primary", html: "<b>p</b>", cwd });
		upsertComponent({ name: "btn", variant: "secondary", html: "<b>s</b>", cwd });
		expect(getComponent({ name: "btn", variant: "primary", cwd })?.html).toContain("p");
		expect(getComponent({ name: "btn", variant: "secondary", cwd })?.html).toContain("s");
		expect(getComponent({ name: "btn", variant: "missing", cwd })).toBeNull();
	});
});

describe("renderComponent", () => {
	it("substitutes declared props with passed values", () => {
		const out = renderComponent({
			component: { name: "card", props: ["title", "body"], slots: [], html: "<h>{{title}}</h><p>{{body}}</p>" },
			props: { title: "T", body: "B" },
		});
		expect(out).toBe("<h>T</h><p>B</p>");
	});

	it("replaces unfilled slots with TODO placeholders, leaves filled-slot markers untouched for caller substitution", () => {
		const out = renderComponent({
			component: {
				name: "card",
				props: [],
				slots: ["action", "footer"],
				html: "<!-- slot:action -->|<!-- slot:footer -->",
			},
			props: { action: "<button/>" },
		});
		expect(out).toContain("TODO: add footer content");
		expect(out).toContain("<!-- slot:action -->");
	});

	it("leaves placeholders alone when their props are not provided", () => {
		const out = renderComponent({
			component: { name: "card", props: ["title"], slots: [], html: "<h>{{title}}</h>" },
			props: {},
		});
		expect(out).toBe("<h>{{title}}</h>");
	});
});
