import { type FSWatcher, watch } from "chokidar";
import { getDesignDir } from "./config";

type FileChangeCallback = (event: {
	type: string;
	name: string | null;
}) => void;

let watcher: FSWatcher | null = null;
const listeners: Set<FileChangeCallback> = new Set();

export function startWatcher(cwd: string = process.cwd()): void {
	if (watcher) return;

	const designPath = getDesignDir(cwd);
	watcher = watch(designPath, {
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 100,
			pollInterval: 50,
		},
	});

	watcher.on("all", (_event, filePath) => {
		const relPath = filePath.replace(`${designPath}/`, "");

		let changeType: string;
		let name: string | null = null;

		if (relPath === "design.md") {
			changeType = "design_changed";
		} else if (relPath === "components.html") {
			changeType = "components_changed";
		} else if (relPath === "layout.html") {
			changeType = "layout_changed";
		} else if (relPath.startsWith("screens/") && relPath.endsWith(".html")) {
			changeType = "screen_changed";
			name = relPath.replace("screens/", "").replace(/\.html$/, "");
		} else {
			return;
		}

		const changeEvent = { type: changeType, name };
		for (const listener of listeners) {
			listener(changeEvent);
		}
	});
}

export function addListener(callback: FileChangeCallback): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}

export function stopWatcher(): void {
	if (watcher) {
		watcher.close();
		watcher = null;
	}
}
