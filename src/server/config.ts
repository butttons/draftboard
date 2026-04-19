import { join } from "node:path";

const DEFAULT_DIR = ".draftboard";

export function getDesignDir(cwd: string = process.cwd()): string {
	const dir = process.env.DRAFTBOARD_DIR || DEFAULT_DIR;
	return join(cwd, dir);
}

export function getScreensDir(cwd: string = process.cwd()): string {
	return join(getDesignDir(cwd), "screens");
}
