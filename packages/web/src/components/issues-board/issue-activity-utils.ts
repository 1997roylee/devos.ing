import type { ProjectBoardTaskRecord, TaskActivityRecord } from "../../lib/api";

export function createTaskCreatedActivity(
	task: ProjectBoardTaskRecord,
): TaskActivityRecord {
	return {
		id: `${task.id}:created:fallback`,
		kind: "created",
		actorId: task.creatorId,
		actorType: "human",
		title: "created this issue",
		body: "",
		status: task.status,
		createdAt: task.createdAt,
	};
}
