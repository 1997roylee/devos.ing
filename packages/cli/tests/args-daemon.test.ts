import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";

describe("parseArgs daemon", () => {
	it("parses daemon cli-only command", () => {
		expect(parseArgs(["bun", "devos", "daemon", "--cli-only"])).toEqual({
			kind: "daemon",
			cliOnly: true,
		});
	});

	it("parses daemon cli-only polling command", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"daemon",
				"--cli-only",
				"--poll-forever",
				"--all-projects",
			]),
		).toEqual({
			kind: "daemon",
			cliOnly: true,
			pollForever: true,
			allProjects: true,
		});
	});

	it("rejects daemon polling flags without cli-only", () => {
		expect(() =>
			parseArgs(["bun", "devos", "daemon", "--poll-forever"]),
		).toThrow("daemon polling flags require --cli-only");
	});

	it("rejects all-projects without poll-forever", () => {
		expect(() =>
			parseArgs(["bun", "devos", "daemon", "--cli-only", "--all-projects"]),
		).toThrow("daemon --all-projects requires --poll-forever");
	});
});
