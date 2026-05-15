import { describe, expect, it } from "bun:test";
import { createApiClient } from "../../web/src/lib/api/client";

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
						projectId: "default",
						title: "Create a task",
						content: "Task body",
						priority: 1,
						status: "open",
						dueDate: null,
						creatorId: "owner-1",
						linkedPr: "https://linear.example/ROY-1",
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

	it("streams CLI dispatch events with an opt-in payload", async () => {
		const calls: Array<{ url: string; headers: Headers; body: unknown }> = [];
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			calls.push({
				url: String(input),
				headers: new Headers(init?.headers),
				body: init?.body ? JSON.parse(String(init.body)) : undefined,
			});
			return new Response(
				new ReadableStream<Uint8Array>({
					start(controller) {
						const encoder = new TextEncoder();
						controller.enqueue(
							encoder.encode(
								[
									'event: stdout\ndata: {"text":"hello"}\n',
									'event: complete\ndata: {"result":{"status":"succeeded","request":{"action":"projects"}}}\n',
									"",
								].join("\n"),
							),
						);
						controller.close();
					},
				}),
				{ status: 200, headers: { "content-type": "text/event-stream" } },
			);
		}) as typeof fetch;
		const client = createApiClient({
			baseUrl: "http://localhost:3000",
			fetchFn,
		});
		const events: unknown[] = [];

		await client.streamCliDispatch({ action: "projects" }, (event) =>
			events.push(event),
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("http://localhost:3000/api/cli/dispatch");
		expect(calls[0]?.headers.get("accept")).toBe("text/event-stream");
		expect(calls[0]?.body).toEqual({ action: "projects", stream: true });
		expect(events).toEqual([
			{ type: "stdout", text: "hello" },
			{
				type: "complete",
				result: { status: "succeeded", request: { action: "projects" } },
			},
		]);
	});
});
