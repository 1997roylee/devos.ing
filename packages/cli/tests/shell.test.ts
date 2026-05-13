import { describe, expect, it } from "bun:test";
import { runCommand } from "../src/utils/shell";

describe("runCommand", () => {
	it("returns a timeout result when the child process exceeds timeoutMs", async () => {
		const result = await runCommand(
			process.execPath,
			["-e", "setTimeout(() => {}, 1000)"],
			{
				cwd: process.cwd(),
				timeoutMs: 10,
			},
		);

		expect(result.code).toBe(124);
		expect(result.stderr).toContain("timed out after 10ms");
	});
});
