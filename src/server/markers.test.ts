import { describe, it, expect } from "vitest";
import { parseMarkers, replaceMarkerOccurrence } from "./markers";

function unwrap<T>(r: { match: (h: { ok: (v: T) => unknown; err: (e: Error) => unknown }) => unknown }): T {
	return r.match({ ok: (v: T) => v, err: (e: Error) => { throw e; } }) as T;
}

describe("parseMarkers", () => {
	it("parses flat markers and captures attrs", () => {
		const content = `<!-- card:start props="title" -->\n<p>1</p>\n<!-- card:end -->\n<!-- btn:start variant="primary" -->\n<b/>\n<!-- btn:end -->`;
		const markers = unwrap(parseMarkers(content));
		expect(markers).toHaveLength(2);
		expect(markers[0].name).toBe("card");
		expect(markers[0].props.props).toBe("title");
		expect(markers[1].props.variant).toBe("primary");
	});

	it("handles same-name nesting by depth-matching :end", () => {
		const content = `<!-- x:start -->\nouter\n<!-- x:start -->\ninner\n<!-- x:end -->\nmore\n<!-- x:end -->`;
		const markers = unwrap(parseMarkers(content));
		expect(markers).toHaveLength(2);
		const outer = markers[0];
		const inner = markers[1];
		expect(content.slice(outer.innerStart, outer.innerEnd)).toContain("inner");
		expect(content.slice(outer.innerStart, outer.innerEnd)).toContain("more");
		expect(content.slice(inner.innerStart, inner.innerEnd).trim()).toBe("inner");
	});

	it("returns an error when a :start has no matching :end", () => {
		const result = parseMarkers("<!-- card:start -->\n<p/>\n");
		expect(result.isErr()).toBe(true);
	});

	it("does not conflate different marker names", () => {
		const content = `<!-- a:start -->\n<!-- b:start -->\nbody\n<!-- b:end -->\n<!-- a:end -->`;
		const markers = unwrap(parseMarkers(content));
		expect(markers.map((m) => m.name)).toEqual(["a", "b"]);
	});

	it("records accurate line numbers", () => {
		const content = `line1\n<!-- c:start -->\nbody\n<!-- c:end -->\nafter`;
		const [m] = unwrap(parseMarkers(content));
		expect(m.startLine).toBe(2);
		expect(m.endLine).toBe(4);
	});
});

describe("replaceMarkerOccurrence", () => {
	const content = `<!-- row:start -->\nA\n<!-- row:end -->\n<!-- row:start -->\nB\n<!-- row:end -->\n<!-- row:start -->\nC\n<!-- row:end -->`;

	it("replaces a single occurrence by positive index", () => {
		const r = replaceMarkerOccurrence({ content, name: "row", occurrence: 1, html: "Z" });
		const { content: next, replaced } = unwrap(r);
		expect(replaced).toBe(1);
		expect(next).toContain("A");
		expect(next).toContain("Z");
		expect(next).toContain("C");
		expect(next).not.toContain("\nB\n");
	});

	it("supports negative indexing (last = -1)", () => {
		const r = replaceMarkerOccurrence({ content, name: "row", occurrence: -1, html: "Z" });
		const { content: next } = unwrap(r);
		expect(next).toContain("A");
		expect(next).toContain("B");
		expect(next).not.toContain("\nC\n");
		expect(next).toContain("Z");
	});

	it('replaces every occurrence with "all"', () => {
		const r = replaceMarkerOccurrence({ content, name: "row", occurrence: "all", html: "Z" });
		const { replaced } = unwrap(r);
		expect(replaced).toBe(3);
	});

	it("errors on out-of-range occurrence", () => {
		const r = replaceMarkerOccurrence({ content, name: "row", occurrence: 99, html: "Z" });
		expect(r.isErr()).toBe(true);
	});

	it("errors when no markers match the name", () => {
		const r = replaceMarkerOccurrence({ content, name: "nope", occurrence: 0, html: "Z" });
		expect(r.isErr()).toBe(true);
	});
});
