import { describe, expect, it } from "bun:test";
import { formatTaskCreateError } from "../../web/src/components/task-create/task-create-chat-errors";
import { createApiClient } from "../../web/src/lib/api/client";
import { resolveWebServerProxyWsUrl } from "../../web/src/lib/api/web-client";

describe("web api client task create", () => {
	it("serializes clarification answers in chat task create payload", async () => {
		const calls: Array<{ url: string; body: unknown }> = [];
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			calls.push({
				url: String(input),
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
			});
			return new Response(
				JSON.stringify({
					status: "created",
					issue: {
						id: "lin-1",
						identifier: "ROY-1",
						title: "Create a task",
						url: "https://linear.example/ROY-1",
					},
					task: {
						id: "task-1",
						taskKey: "TASK-000001",
						projectId: "default",
						title: "Create a task",
						content: "Task body",
						priority: 1,
						status: "open",
						dueDate: null,
						creatorId: "owner-1",
						linkedPr: "https://linear.example/ROY-1",
						linearIssueId: "lin-1",
						linearIdentifier: "ROY-1",
						linearUrl: "https://linear.example/ROY-1",
						createdAt: "2026-05-13T00:00:00.000Z",
						updatedAt: "2026-05-13T00:00:00.000Z",
					},
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;
		const client = createApiClient({
			baseUrl: "http://localhost:3000",
			fetchFn,
		});

		await client.createTask({
			request: "Create a task",
			projectId: "default",
			answers: [{ question: "Who is this for?", answer: "CLI users" }],
		});

		expect(calls).toEqual([
			{
				url: "http://localhost:3000/api/tasks/chat-create",
				body: {
					request: "Create a task",
					projectId: "default",
					answers: [{ question: "Who is this for?", answer: "CLI users" }],
				},
			},
		]);
	});

	it("allows chat task create payloads without project ids", async () => {
		const calls: Array<{ url: string; body: unknown }> = [];
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			calls.push({
				url: String(input),
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
			});
			return new Response(
				JSON.stringify({
					status: "created",
					task: {
						id: "task-1",
						taskKey: "TASK-000001",
						projectId: null,
						title: "Create a task",
						content: "Task body",
						priority: 1,
						status: "open",
						dueDate: null,
						creatorId: "owner-1",
						linkedPr: null,
						createdAt: "2026-05-13T00:00:00.000Z",
						updatedAt: "2026-05-13T00:00:00.000Z",
					},
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;
		const client = createApiClient({
			baseUrl: "http://localhost:3000",
			fetchFn,
		});

		const response = await client.createTask({
			request: "Create a task",
		});

		expect(response.status).toBe("created");
		if (response.status !== "created") {
			throw new Error("Expected created task response");
		}
		expect(response.task.projectId).toBeNull();
		expect(response.task.linearIdentifier).toBeNull();
		expect(calls).toEqual([
			{
				url: "http://localhost:3000/api/tasks/chat-create",
				body: {
					request: "Create a task",
				},
			},
		]);
	});

	it("normalizes legacy task descriptions in chat task create responses", async () => {
		const fetchFn = (async () =>
			new Response(
				JSON.stringify({
					status: "created",
					task: {
						id: "task-1",
						taskKey: "TASK-000001",
						projectId: null,
						title: "Create a task",
						description: "Legacy task body",
						priority: 1,
						status: "open",
						dueDate: null,
						creatorId: "owner-1",
						linkedPr: null,
						createdAt: "2026-05-13T00:00:00.000Z",
						updatedAt: "2026-05-13T00:00:00.000Z",
					},
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			)) as unknown as typeof fetch;
		const client = createApiClient({
			baseUrl: "http://localhost:3000",
			fetchFn,
		});

		const response = await client.createTask({
			request: "Create a task",
		});

		expect(response).toMatchObject({
			status: "created",
			task: {
				content: "Legacy task body",
				linearIssueId: null,
				linearIdentifier: null,
				linearUrl: null,
			},
		});
	});

	it("formats task creation failures as board task errors", () => {
		expect(
			formatTaskCreateError({
				status: "db_error",
				error: "Task creation returned invalid structured output",
			}),
		).toBe(
			"Board task creation failed: Task creation returned invalid structured output",
		);
	});

	it("streams CLI command events with an opt-in payload", async () => {
		const calls: Array<{ url: string; body: unknown }> = [];
		const WebSocketImpl = createMockWebSocket(calls);
		const client = createApiClient({
			baseUrl: "http://localhost:3000",
			WebSocketImpl,
		});
		const events: unknown[] = [];

		await client.streamCliCommand({ action: "projects" }, (event) =>
			events.push(event),
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("ws://localhost:3000/api/cli/stream");
		expect(calls[0]?.body).toEqual({
			type: "command",
			requestId: expect.any(String),
			request: { action: "projects" },
		});
		expect(events).toEqual([
			{ type: "stdout", text: "hello" },
			{
				type: "complete",
				result: { status: "succeeded", request: { action: "projects" } },
			},
		]);
	});

	it("defaults browser websocket streams to the server proxy endpoint", () => {
		expect(resolveWebServerProxyWsUrl({})).toBe("/api/cli/stream");
	});

	it("uses configured public server websocket stream endpoints", () => {
		expect(
			resolveWebServerProxyWsUrl({
				DEVOS_CLI_DAEMON_WS_URL: "ws://127.0.0.1:3002",
				NEXT_PUBLIC_DEVOS_SERVER_WS_URL: "ws://127.0.0.1:3001/api/cli/stream",
			}),
		).toBe("ws://127.0.0.1:3001/api/cli/stream");
	});
});

function createMockWebSocket(
	calls: Array<{ url: string; body: unknown }>,
): typeof WebSocket {
	class MockWebSocket {
		private listeners = new Map<string, Array<(event: MessageEvent) => void>>();

		constructor(private readonly url: string) {
			queueMicrotask(() => this.emit("open", {}));
		}

		addEventListener(event: string, listener: (event: MessageEvent) => void) {
			this.listeners.set(event, [
				...(this.listeners.get(event) ?? []),
				listener,
			]);
		}

		send(body: string): void {
			const parsed = JSON.parse(body);
			calls.push({ url: this.url, body: parsed });
			const requestId = parsed.requestId;
			this.emit("message", {
				data: JSON.stringify({ type: "stdout", requestId, text: "hello" }),
			});
			this.emit("message", {
				data: JSON.stringify({
					type: "complete",
					requestId,
					result: {
						status: "succeeded",
						request: { action: "projects" },
					},
				}),
			});
		}

		close(): void {}

		private emit(event: string, payload: Partial<MessageEvent>): void {
			for (const listener of this.listeners.get(event) ?? []) {
				listener(payload as MessageEvent);
			}
		}
	}
	return MockWebSocket as unknown as typeof WebSocket;
}
