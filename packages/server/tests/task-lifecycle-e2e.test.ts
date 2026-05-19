import { afterEach, describe, expect, it } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket } from "ws";
import { createHandleRequest } from "../src/app";
import { createExpressApp, listenExpressApp } from "../src/express-server";
import { createRealtimeEventBus } from "../src/realtime";
import type { RealtimeEvent } from "../src/realtime";
import { WORKFLOW_DATA_WS_PATH } from "../src/workflow-data";
import { attachWorkflowDataSocket } from "../src/workflow-data/workflow-data-socket";
import type { WorkflowDataSocketProxy } from "../src/workflow-data/workflow-data-socket.types";
import type { WorkflowDataAction } from "../src/workflow-data/workflow-data.types";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";
import { seedTaskRouteProject } from "./task-route-test-helpers";

interface TestServer {
	baseUrl: string;
	database: DrizzleServerTestDatabase;
	events: RealtimeEvent[];
	server: Server;
	socketProxy: WorkflowDataSocketProxy;
}

let testServer: TestServer | undefined;

afterEach(async () => {
	if (!testServer) {
		return;
	}
	await testServer.socketProxy.close();
	await closeServer(testServer.server);
	await testServer.database.cleanup();
	testServer = undefined;
});

describe("task lifecycle e2e", () => {
	it("creates a task, records polling, assigns an agent, and updates status", async () => {
		testServer = await setupTestServer();
		const socket = await connectWorkflowSocket(testServer.baseUrl);

		try {
			const created = await requestJson<{
				assigneeId: string | null;
				id: string;
				projectId: string;
				status: string;
				taskKey: string;
			}>(`${testServer.baseUrl}/api/tasks`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					projectId: "project-1",
					title: "Lifecycle task",
					content: "Exercise the board task lifecycle.",
					priority: 1,
					status: "todo",
					creatorId: "owner-1",
				}),
			});

			expect(created.taskKey).toBe("TASK-000001");
			expect(created.projectId).toBe("project-1");
			expect(created.status).toBe("todo");
			expect(created.assigneeId).toBeNull();

			const polling = await sendWorkflowAction(socket, "polling.record", {
				pollerId: "internal-tasks:project-1",
				sourceType: "internal-tasks",
				sourceId: "project-1",
				projectId: "project-1",
				state: "success",
				intervalMs: 5000,
				level: "info",
				eventType: "tick_completed",
				message: "Internal task polling tick completed",
				counts: { readyTaskCount: 1, dispatchCount: 1 },
			});
			expect(polling).toMatchObject({
				status: "ok",
				payload: { recorded: true },
			});

			const assigned = await requestJson<{ assigneeId: string }>(
				`${testServer.baseUrl}/api/tasks/${created.id}`,
				{
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ assigneeId: "agent-codex-1" }),
				},
			);
			expect(assigned.assigneeId).toBe("agent-codex-1");

			const updated = await sendWorkflowAction(socket, "tasks.update", {
				taskId: created.id,
				values: { status: "implementing" },
			});
			expect(updated).toMatchObject({
				status: "ok",
				payload: { id: created.id, status: "implementing" },
			});

			const finalTask = await requestJson<{
				assigneeId: string;
				status: string;
			}>(`${testServer.baseUrl}/api/tasks/${created.id}`);
			expect(finalTask).toMatchObject({
				assigneeId: "agent-codex-1",
				status: "implementing",
			});

			const taskList = await requestJson<Array<{ id: string; status: string }>>(
				`${testServer.baseUrl}/api/tasks`,
			);
			expect(taskList).toEqual([
				expect.objectContaining({
					id: created.id,
					assigneeId: "agent-codex-1",
					status: "implementing",
				}),
			]);

			const activity = await requestJson<unknown>(
				`${testServer.baseUrl}/api/tasks/${created.id}/activity`,
			);
			expect(JSON.stringify(activity)).toContain("changed assignee id");
			expect(JSON.stringify(activity)).toContain("changed status");

			const pollingStatus = await requestJson<{
				events: Array<{ eventType: string; message: string }>;
				pollers: Array<{ id: string; lastReadyTaskCount: number }>;
			}>(`${testServer.baseUrl}/api/polling/status`);
			expect(pollingStatus.pollers).toContainEqual(
				expect.objectContaining({
					id: "internal-tasks:project-1",
					lastReadyTaskCount: 1,
				}),
			);
			expect(pollingStatus.events).toContainEqual(
				expect.objectContaining({
					eventType: "tick_completed",
					message: "Internal task polling tick completed",
				}),
			);

			expect(testServer.events.map((event) => event.type)).toEqual([
				"issue.created",
				"polling.event",
				"issue.updated",
				"issue.updated",
			]);
		} finally {
			socket.close();
		}
	});
});

async function setupTestServer(): Promise<TestServer> {
	const database = await createDrizzleServerTestDatabase();
	await seedTaskRouteProject(database.db, "project-1");
	const realtimeEvents = createRealtimeEventBus();
	const events: RealtimeEvent[] = [];
	realtimeEvents.subscribe((event) => events.push(event));
	const app = createExpressApp(
		createHandleRequest({
			cliExecutor: {
				execute: async (request) => ({ status: "succeeded", request }),
				executeStream: async (request) => ({ status: "succeeded", request }),
				getHistory: () => [],
			},
			db: database.db,
			realtimeEvents,
		}),
	);
	const server = await listenExpressApp(app, 0).catch(() =>
		listenExpressApp(app, testPort()),
	);
	const socketProxy = attachWorkflowDataSocket({
		server,
		path: WORKFLOW_DATA_WS_PATH,
		db: database.db,
		realtimeEvents,
	});
	const address = server.address() as AddressInfo;
	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		database,
		events,
		server,
		socketProxy,
	};
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init);
	expect(response.ok).toBe(true);
	return (await response.json()) as T;
}

async function connectWorkflowSocket(baseUrl: string): Promise<WebSocket> {
	const url = new URL(WORKFLOW_DATA_WS_PATH, baseUrl);
	url.protocol = "ws:";
	const socket = new WebSocket(url);
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	return socket;
}

async function sendWorkflowAction(
	socket: WebSocket,
	action: WorkflowDataAction,
	payload: unknown,
): Promise<Record<string, unknown>> {
	const requestId = crypto.randomUUID();
	socket.send(
		JSON.stringify({
			type: "workflow.request",
			requestId,
			action,
			payload,
		}),
	);
	return new Promise((resolve) => {
		socket.once("message", (message) => {
			resolve(JSON.parse(String(message)) as Record<string, unknown>);
		});
	});
}

async function closeServer(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}

function testPort(): number {
	return 31_000 + Math.floor(Math.random() * 10_000);
}
