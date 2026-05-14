import { describe, expect, it } from "bun:test";
import { createApiClient } from "../../web/src/lib/api/client";

function okJsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("web board client parser", () => {
	it("parses workspace project payloads", async () => {
		const fetchFn = (async (input: URL | RequestInfo) => {
			expect(String(input)).toBe("/api/server/api/workspaces/ws-1/projects");
			return okJsonResponse([
				{
					id: "project-1",
					boardId: "board-1",
					externalProjectId: "ext-1",
					name: "Project 1",
					description: null,
					ownerId: "owner-1",
					createdAt: "2026-05-14T00:00:00.000Z",
					updatedAt: "2026-05-14T00:00:00.000Z",
				},
			]);
		}) as typeof fetch;
		const client = createApiClient({ baseUrl: "/api/server", fetchFn });

		const projects = await client.listWorkspaceProjects("ws-1");

		expect(projects).toHaveLength(1);
		expect(projects[0]?.id).toBe("project-1");
		expect(projects[0]?.externalProjectId).toBe("ext-1");
	});

	it("rejects invalid board task payloads", async () => {
		const fetchFn = (async () =>
			okJsonResponse({
				id: "board-1",
				name: "Board 1",
				description: null,
				ownerId: "owner-1",
				createdAt: "2026-05-14T00:00:00.000Z",
				updatedAt: "2026-05-14T00:00:00.000Z",
				projects: [],
				tasks: [
					{
						id: "task-1",
						projectId: "project-1",
						title: "Task",
						content: "content",
						priority: "high",
						status: "open",
						dueDate: null,
						creatorId: "owner-1",
						linkedPr: null,
						createdAt: "2026-05-14T00:00:00.000Z",
						updatedAt: "2026-05-14T00:00:00.000Z",
					},
				],
			})) as unknown as typeof fetch;
		const client = createApiClient({ baseUrl: "/api/server", fetchFn });

		await expect(client.getProjectBoard("ws-1", "project-1")).rejects.toThrow(
			"Invalid /api/workspaces/:workspaceId/projects/:projectId/board response field 'priority'",
		);
	});
});
