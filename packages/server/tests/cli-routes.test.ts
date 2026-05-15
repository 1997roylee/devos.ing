import { describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";
import type { AppDeps } from "../src/app.types";

type TestNotificationSender = NonNullable<AppDeps["notificationSender"]>;

describe("CLI server routes", () => {
	it("dispatches structured requests and returns execution results", async () => {
		const calls: unknown[] = [];
		const app = createHandleRequest(
			createDeps({
				execute: async (request) => {
					calls.push(request);
					return {
						status: "succeeded",
						request: request as { action: string },
						invocation: { command: "npx", args: ["devos", "projects"] },
						commandResult: { code: 0, stdout: "ok", stderr: "" },
					};
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "projects" }),
			}),
		);

		expect(response.status).toBe(200);
		expect(calls).toEqual([{ action: "projects" }]);
		expect((await response.json()).status).toBe("succeeded");
	});

	it("streams dispatch events when requested", async () => {
		const calls: unknown[] = [];
		const app = createHandleRequest(
			createDeps({
				executeStream: async (request, emit) => {
					calls.push(request);
					emit({
						type: "start",
						request,
						invocation: { command: "npx", args: ["devos", "projects"] },
					});
					emit({ type: "stdout", text: "ok\n" });
					emit({ type: "stderr", text: "warn\n" });
					const result = {
						status: "succeeded" as const,
						request,
						invocation: { command: "npx", args: ["devos", "projects"] },
						commandResult: { code: 0, stdout: "ok\n", stderr: "warn\n" },
					};
					emit({ type: "complete", result });
					return result;
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: {
					accept: "text/event-stream",
					"content-type": "application/json",
				},
				body: JSON.stringify({ action: "projects", stream: true }),
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
		expect(calls).toEqual([{ action: "projects" }]);
		expect(parseSseEvents(await response.text())).toEqual([
			{
				event: "start",
				data: {
					request: { action: "projects" },
					invocation: { command: "npx", args: ["devos", "projects"] },
				},
			},
			{ event: "stdout", data: { text: "ok\n" } },
			{ event: "stderr", data: { text: "warn\n" } },
			{
				event: "complete",
				data: {
					result: {
						status: "succeeded",
						request: { action: "projects" },
						invocation: { command: "npx", args: ["devos", "projects"] },
						commandResult: { code: 0, stdout: "ok\n", stderr: "warn\n" },
					},
				},
			},
		]);
	});

	it("streams rejected dispatch results without raw command execution", async () => {
		const app = createHandleRequest(
			createDeps({
				executeStream: async (request, emit) => {
					const result = {
						status: "rejected" as const,
						request,
						error: "Unsupported CLI action: unknown-action",
					};
					emit({ type: "error", error: result.error });
					emit({ type: "complete", result });
					return result;
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: {
					accept: "text/event-stream",
					"content-type": "application/json",
				},
				body: JSON.stringify({ action: "unknown-action", stream: true }),
			}),
		);

		expect(response.status).toBe(200);
		expect(parseSseEvents(await response.text())).toEqual([
			{
				event: "error",
				data: { error: "Unsupported CLI action: unknown-action" },
			},
			{
				event: "complete",
				data: {
					result: {
						status: "rejected",
						request: { action: "unknown-action" },
						error: "Unsupported CLI action: unknown-action",
					},
				},
			},
		]);
	});

	it("dispatches non-interactive task create payloads", async () => {
		const calls: unknown[] = [];
		const app = createHandleRequest(
			createDeps({
				execute: async (request) => {
					calls.push(request);
					return {
						status: "succeeded",
						request: request as { action: string },
					};
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "task",
					taskAction: "create",
					request: "Build a better setup flow",
					nonInteractive: true,
					maxClarificationRounds: 2,
					clarificationAnswers: [{ question: "Who?", answer: "CLI users" }],
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(calls).toEqual([
			{
				action: "task",
				taskAction: "create",
				request: "Build a better setup flow",
				nonInteractive: true,
				maxClarificationRounds: 2,
				clarificationAnswers: [{ question: "Who?", answer: "CLI users" }],
			},
		]);
	});

	it("forwards task create payload when nonInteractive is omitted or false", async () => {
		const calls: unknown[] = [];
		const app = createHandleRequest(
			createDeps({
				execute: async (request) => {
					calls.push(request);
					return {
						status: "succeeded",
						request: request as { action: string },
					};
				},
			}),
		);

		const omittedResponse = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "task",
					taskAction: "create",
					request: "Build task flow",
				}),
			}),
		);
		const falseResponse = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "task",
					taskAction: "create",
					request: "Build task flow",
					nonInteractive: false,
				}),
			}),
		);

		expect(omittedResponse.status).toBe(200);
		expect(falseResponse.status).toBe(200);
		expect(calls).toEqual([
			{
				action: "task",
				taskAction: "create",
				request: "Build task flow",
			},
			{
				action: "task",
				taskAction: "create",
				request: "Build task flow",
				nonInteractive: false,
			},
		]);
	});

	it("returns dispatch history", async () => {
		const history = [
			{
				requestedAt: "2026-05-12T00:00:00.000Z",
				finishedAt: "2026-05-12T00:00:01.000Z",
				request: { action: "projects" as const },
				status: "succeeded" as const,
				command: "npx",
				args: ["devos", "projects"],
				exitCode: 0,
				stdout: "ok",
				stderr: "",
			},
		];
		const app = createHandleRequest(createDeps({ history }));
		const response = await app(
			new Request("http://localhost/api/cli/history", { method: "GET" }),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(history);
	});

	it("rejects unsupported methods for CLI routes", async () => {
		const app = createHandleRequest(createDeps());
		const historyMethod = await app(
			new Request("http://localhost/api/cli/history", { method: "POST" }),
		);
		const dispatchMethod = await app(
			new Request("http://localhost/api/cli/dispatch", { method: "GET" }),
		);

		expect(historyMethod.status).toBe(405);
		expect(await historyMethod.json()).toEqual({ error: "Method Not Allowed" });
		expect(dispatchMethod.status).toBe(405);
		expect(await dispatchMethod.json()).toEqual({
			error: "Method Not Allowed",
		});
	});

	it("rejects malformed JSON and invalid request body shapes", async () => {
		const app = createHandleRequest(createDeps());
		const malformedJson = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{not-json}",
			}),
		);
		const arrayBody = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(["projects"]),
			}),
		);
		const missingAction = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({}),
			}),
		);

		expect(malformedJson.status).toBe(400);
		expect(await malformedJson.json()).toEqual({
			error: "Malformed JSON body",
		});
		expect(arrayBody.status).toBe(400);
		expect(await arrayBody.json()).toEqual({
			error: "Malformed dispatch request: expected object body",
		});
		expect(missingAction.status).toBe(400);
		expect(await missingAction.json()).toEqual({
			error: "Malformed dispatch request: action must be a non-empty string",
		});
	});

	it("rejects unknown actions without unsafe shell execution", async () => {
		let calls = 0;
		const app = createHandleRequest(
			createDeps({
				execute: async (request) => {
					calls += 1;
					return {
						status: "rejected",
						request: request as { action: string },
						error: "Unsupported CLI action: unknown-action",
					};
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "unknown-action" }),
			}),
		);

		expect(calls).toBe(1);
		expect(response.status).toBe(400);
		expect((await response.json()).status).toBe("rejected");
	});

	it("rejects unsafe raw command payloads without dispatching", async () => {
		let calls = 0;
		const app = createHandleRequest(
			createDeps({
				execute: async (request) => {
					calls += 1;
					return {
						status: "succeeded",
						request: request as { action: string },
					};
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/cli/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "projects",
					command: "rm",
					args: ["-rf", "/"],
				}),
			}),
		);

		expect(calls).toBe(0);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error:
				"Unsafe dispatch request: raw command field 'command' is not allowed",
		});
	});

	it("accepts task outcome notifications and delegates delivery", async () => {
		const calls: unknown[] = [];
		const app = createHandleRequest(
			createDeps({
				sendNotification: async (request) => {
					calls.push(request);
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/notifications", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "task-outcome",
					payload: {
						from: "ops@example.com",
						to: ["dev@example.com"],
						subject: "ENG-1 DONE",
						text: "done",
					},
				}),
			}),
		);

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ status: "accepted" });
		expect(calls).toHaveLength(1);
	});

	it("accepts human review notifications and delegates delivery", async () => {
		const calls: unknown[] = [];
		const app = createHandleRequest(
			createDeps({
				sendNotification: async (request) => {
					calls.push(request);
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/notifications", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "human-review-required",
					payload: {
						from: "ops@example.com",
						to: ["dev@example.com"],
						subject: "ENG-1 HUMAN REVIEW REQUIRED",
						text: "review required",
					},
					complexityScore: 7,
					reason: "High complexity",
				}),
			}),
		);

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ status: "accepted" });
		expect(calls).toHaveLength(1);
	});

	it("rejects malformed notification requests", async () => {
		const app = createHandleRequest(createDeps());

		const invalidType = await app(
			new Request("http://localhost/api/notifications", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "bad-type",
					payload: {
						from: "ops@example.com",
						to: ["dev@example.com"],
						subject: "x",
						text: "x",
					},
				}),
			}),
		);
		const invalidPayload = await app(
			new Request("http://localhost/api/notifications", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "task-outcome",
					payload: { from: "ops@example.com" },
				}),
			}),
		);

		expect(invalidType.status).toBe(400);
		expect(await invalidType.json()).toEqual({
			error:
				"Malformed notification request: type must be 'task-outcome' or 'human-review-required'",
		});
		expect(invalidPayload.status).toBe(400);
		expect(await invalidPayload.json()).toEqual({
			error:
				"Malformed notification request: payload must include from, to, subject, and text",
		});
	});
});

function createDeps(overrides?: {
	execute?: AppDeps["cliExecutor"]["execute"];
	executeStream?: AppDeps["cliExecutor"]["executeStream"];
	sendNotification?: TestNotificationSender["sendNotification"];
	history?: AppDeps["cliExecutor"]["getHistory"] extends () => infer T
		? T
		: never;
	repositories?: AppDeps["repositories"];
}): AppDeps {
	return {
		cliExecutor: {
			execute:
				overrides?.execute ??
				(async (request) => ({
					status: "succeeded",
					request,
				})),
			executeStream:
				overrides?.executeStream ??
				(async (request, emit) => {
					const result = {
						status: "succeeded" as const,
						request,
					};
					emit({ type: "complete", result });
					return result;
				}),
			getHistory: () => overrides?.history ?? [],
		},
		notificationSender: {
			sendNotification: overrides?.sendNotification ?? (async () => {}),
		},
		notificationService: {
			send: async () => ({ status: "ok" }),
		},
	};
}

function parseSseEvents(text: string): Array<{ event: string; data: unknown }> {
	return text
		.trim()
		.split("\n\n")
		.filter(Boolean)
		.map((block) => {
			const lines = block.split("\n");
			const event = lines
				.find((line) => line.startsWith("event: "))
				?.slice("event: ".length);
			const data = lines
				.filter((line) => line.startsWith("data: "))
				.map((line) => line.slice("data: ".length))
				.join("\n");
			return { event: event ?? "", data: JSON.parse(data) as unknown };
		});
}
