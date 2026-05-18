import { describe, expect, it } from "bun:test";
import { stat } from "node:fs/promises";
import path from "node:path";
import {
	PGLITE_RUNTIME_ASSETS,
	resolvePgliteRuntimeAssets,
} from "../scripts/build";

describe("CLI build script", () => {
	it("resolves PGlite runtime assets required by bundled devos", async () => {
		const assets = await resolvePgliteRuntimeAssets();

		expect(assets.map((asset) => asset.fileName).sort()).toEqual(
			[...PGLITE_RUNTIME_ASSETS].sort(),
		);
		for (const asset of assets) {
			expect(path.basename(asset.path)).toBe(asset.fileName);
			expect((await stat(asset.path)).isFile()).toBe(true);
		}
	});
});
