import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { loadConfig } from "../src/config";

const envKeys = [
	"LINEAR_API_KEY",
	"LINEAR_STATUS_ASSIGNED",
	"LINEAR_STATUS_PLANNING",
	"LINEAR_STATUS_IMPLEMENTING",
	"LINEAR_STATUS_PR_CREATED",
	"LINEAR_STATUS_REVIEWING",
	"LINEAR_STATUS_TESTING",
	"LINEAR_STATUS_BLOCKED",
	"LINEAR_STATUS_DONE",
] as const;

const previousEnv: Record<string, string | undefined> = {};

describe("loadConfig", () => {
	beforeEach(() => {
		for (const key of envKeys) {
			previousEnv[key] = process.env[key];
			process.env[key] = key.toLowerCase();
		}
	});

	afterEach(() => {
		for (const key of envKeys) {
			process.env[key] = previousEnv[key];
		}
	});

	it("loads required env values", async () => {
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.linear.apiKey).toBe("linear_api_key");
		expect(config.projects[0]?.linear.statusMap.assigned).toBe(
			"linear_status_assigned",
		);
	});
});
