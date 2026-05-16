import type {
	TaskActivityRecord,
	TaskActivitySourceRows,
} from "./task-activity.types";

export function composeTaskActivity(rows: TaskActivitySourceRows) {
	const stepsByLog = new Map(
		rows.executionLogs.map((log) => [
			log.id,
			rows.executionSteps
				.filter((step) => step.executionLogId === log.id)
				.sort((left, right) => left.stepNumber - right.stepNumber)
				.map((step) => ({
					id: step.id,
					stepNumber: step.stepNumber,
					action: step.action,
					status: step.status,
					detail: step.detail,
					recordedAt: step.recordedAt,
				})),
		]),
	);
	const activities: TaskActivityRecord[] = [
		{
			id: `${rows.task.id}:created`,
			kind: "created",
			actorId: rows.task.creatorId,
			actorType: "human",
			title: "created this issue",
			body: "",
			status: rows.task.status,
			createdAt: rows.task.createdAt,
		},
		...rows.comments.map((comment) => ({
			id: comment.id,
			kind: "comment" as const,
			actorId: comment.authorId,
			actorType: comment.authorType,
			title:
				comment.authorType === "system"
					? "updated this issue"
					: "commented on this issue",
			body: comment.comment,
			status: null,
			createdAt: comment.createdAt,
		})),
		...rows.executionLogs.map((log) => ({
			id: log.id,
			kind: "execution" as const,
			actorId: "devos",
			actorType: "agent",
			title: "recorded execution output",
			body: log.log,
			status: log.status,
			createdAt: log.startedAt,
			steps: stepsByLog.get(log.id) ?? [],
		})),
	];
	return {
		taskId: rows.task.id,
		activities: activities.sort((left, right) =>
			left.createdAt.localeCompare(right.createdAt),
		),
	};
}
