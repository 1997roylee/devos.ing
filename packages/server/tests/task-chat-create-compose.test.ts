import { describe, expect, it } from "bun:test";
import type { BoardTaskRow } from "../src/db/board-tasks.types";
import { composeTaskChatCreate } from "../src/http/task-chat-create";
import type { TaskChatCreateLinearIssue } from "../src/http/task-chat-create.types";

describe("composeTaskChatCreate", () => {
	it("returns link_error when a created board task cannot be linked", async () => {
		const issue = createdIssue();
		const task = boardTask({ linkedPr: null });
		const result = await composeTaskChatCreate(
			{ request: "Create task", projectId: "project-1" },
			{
				runTaskIntake: async () => ({
					status: "created",
					issue,
					task: {
						title: "Compose task creation",
						description: "Create both task records.",
					},
				}),
				createBoardTask: async () => task,
				linkBoardTask: async () => {
					throw new Error("Link update failed");
				},
			},
		);

		expect(result).toEqual({
			status: "link_error",
			error: "Link update failed",
			issue,
			task,
		});
	});
});

function createdIssue(): TaskChatCreateLinearIssue {
	return {
		id: "lin-1",
		identifier: "ROY-1",
		title: "Compose task creation",
		url: "https://linear.example/ROY-1",
	};
}

function boardTask(overrides: Partial<BoardTaskRow> = {}): BoardTaskRow {
	return {
		id: "task-1",
		projectId: "project-1",
		title: "Compose task creation",
		content: "Create both task records.",
		priority: 1,
		status: "open",
		dueDate: null,
		creatorId: "owner-1",
		linkedPr: "https://linear.example/ROY-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
		...overrides,
	};
}
