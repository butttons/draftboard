import { Result } from "better-result";

export type MarkerProps = Record<string, string>;

export type Marker = {
	name: string;
	props: MarkerProps;
	startLine: number;
	endLine: number;
	outerStart: number;
	outerEnd: number;
	innerStart: number;
	innerEnd: number;
};

const START_RE = /<!--\s+([a-zA-Z][\w-]*):start\b([^>]*?)-->/g;
const END_RE_SOURCE = (name: string): RegExp =>
	new RegExp(`<!--\\s+${name}:end\\s+-->`, "g");

function parseMarkerAttrs(str: string): MarkerProps {
	const attrs: MarkerProps = {};
	const re = /(\w+)=(?:"([^"]*)"|(\S+))/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(str)) !== null) {
		attrs[match[1]] = match[2] ?? match[3];
	}
	return attrs;
}

function lineOf({ content, offset }: { content: string; offset: number }): number {
	let lineNumber = 1;
	for (let index = 0; index < offset && index < content.length; index++) {
		if (content[index] === "\n") lineNumber++;
	}
	return lineNumber;
}

export function parseMarkers(content: string): Result<Marker[], Error> {
	const markers: Marker[] = [];
	START_RE.lastIndex = 0;
	let startMatch: RegExpExecArray | null;

	while ((startMatch = START_RE.exec(content)) !== null) {
		const name = startMatch[1];
		const attrsStr = startMatch[2].trim();
		const outerStart = startMatch.index;
		const innerStart = startMatch.index + startMatch[0].length;

		const endRe = END_RE_SOURCE(name);
		endRe.lastIndex = innerStart;

		let depth = 1;
		let innerEnd = -1;
		let outerEnd = -1;

		const nestedStartRe = new RegExp(
			`<!--\\s+${name}:start\\b[^>]*?-->|<!--\\s+${name}:end\\s+-->`,
			"g",
		);
		nestedStartRe.lastIndex = innerStart;
		let tokenMatch: RegExpExecArray | null;
		while ((tokenMatch = nestedStartRe.exec(content)) !== null) {
			if (tokenMatch[0].includes(":start")) {
				depth++;
			} else {
				depth--;
				if (depth === 0) {
					innerEnd = tokenMatch.index;
					outerEnd = tokenMatch.index + tokenMatch[0].length;
					break;
				}
			}
		}

		if (outerEnd === -1) {
			return Result.err(
				new Error(
					`Unclosed marker "${name}:start" at line ${lineOf({ content, offset: outerStart })}`,
				),
			);
		}

		markers.push({
			name,
			props: parseMarkerAttrs(attrsStr),
			startLine: lineOf({ content, offset: outerStart }),
			endLine: lineOf({ content, offset: outerEnd }),
			outerStart,
			outerEnd,
			innerStart,
			innerEnd,
		});
	}

	return Result.ok(markers);
}

export function replaceMarkerOccurrence({
	content,
	name,
	occurrence,
	html,
}: {
	content: string;
	name: string;
	occurrence: number | "all";
	html: string;
}): Result<{ content: string; replaced: number }, Error> {
	const result = parseMarkers(content);
	if (result.isErr()) return result as Result<never, Error>;
	const all = result.unwrap();
	const matches = all.filter((marker) => marker.name === name);
	if (matches.length === 0) {
		return Result.err(new Error(`No marker "${name}" found.`));
	}

	let targets: Marker[];
	if (occurrence === "all") {
		targets = matches;
	} else {
		const targetIndex = occurrence < 0 ? matches.length + occurrence : occurrence;
		if (targetIndex < 0 || targetIndex >= matches.length) {
			return Result.err(
				new Error(
					`Occurrence ${occurrence} out of range for marker "${name}" (${matches.length} found).`,
				),
			);
		}
		targets = [matches[targetIndex]];
	}

	let next = content;
	const sorted = [...targets].sort((a, b) => b.innerStart - a.innerStart);
	for (const target of sorted) {
		next = next.slice(0, target.innerStart) + `\n${html.trim()}\n` + next.slice(target.innerEnd);
	}
	return Result.ok({ content: next, replaced: targets.length });
}
