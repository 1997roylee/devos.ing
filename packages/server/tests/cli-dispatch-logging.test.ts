import { describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";
import type { AppDeps } from "../src/app.types";
import type { ServerLogContext, ServerLogger } from "../src/logger.types";

interface LogEntry {
	level: "info" | "error" | "fatal";
	context: ServerLogContext;
	message: string;
}

describe("CLI dispatch logging", () => {
	it("logs valid dispatch execution with safe context", async () => {
		const calls: unknown[] = [];
		const logs: LogEntry[] = [];
		const app = createHandleRequest({
			...createDeps(),
			logger: createLogger(logs),
			cliExecutor: {
				execute: async (request) => {
					calls.push(request);
					return { status: "succeeded", request };
				},
				executeStream: async (request) => ({ status: "succeeded", request }),
				getHistory: () => [],
			},
		});

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "task",
					taskAction: "create",
					request: "Build a better setup flow",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(calls).toHaveLength(1);
		expect(logs).toContainEqual({
			level: "info",
			context: {
				method: "POST",
				path: "/api/cli/dispatch",
				action: "task",
				requestKeys: ["action", "request", "taskAction"],
			},
			message: "CLI dispatch executed",
		});
	});

	it("does not log dispatch execution for malformed or unsafe requests", async () => {
		let calls = 0;
		const logs: LogEntry[] = [];
		const app = createHandleRequest({
			...createDeps(),
			logger: createLogger(logs),
			cliExecutor: {
				execute: async (request) => {
					calls += 1;
					return { status: "succeeded", request };
				},
				executeStream: async (request) => ({ status: "succeeded", request }),
				getHistory: () => [],
			},
		});

		const malformed = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{not-json}",
			}),
		);
		const unsafe = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "projects", command: "rm" }),
			}),
		);

		expect(malformed.status).toBe(400);
		expect(unsafe.status).toBe(400);
		expect(calls).toBe(0);
		expect(
			logs.some((entry) => entry.message === "CLI dispatch executed"),
		).toBe(false);
	});
});

function createDeps(): AppDeps {
	return {
		cliExecutor: {
			execute: async (request) => ({
				status: "succeeded",
				request,
			}),
			executeStream: async (request) => ({
				status: "succeeded",
				request,
			}),
			getHistory: () => [],
		},
		notificationSender: {
			sendNotification: async () => {},
		},
		notificationService: {
			send: async () => ({ status: "ok" }),
		},
	};
}

function createLogger(entries: LogEntry[]): ServerLogger {
	return {
		info: (context, message) => {
			entries.push({ level: "info", context, message });
		},
		error: (context, message) => {
			entries.push({ level: "error", context, message });
		},
		fatal: (context, message) => {
			entries.push({ level: "fatal", context, message });
		},
	};
}
