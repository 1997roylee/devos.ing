import {
	assertObjectRecord,
	readNullableString,
	readNumber,
	readString,
} from "./response-utils";
import type {
	TaskActivityRecord,
	TaskActivityResponse,
	TaskActivityStepRecord,
} from "./task-activity.types";

const TASK_ACTIVITY_PATH = "/api/tasks/:taskId/activity";

export function parseTaskActivityResponse(
	payload: unknown,
): TaskActivityResponse {
	const row = assertObjectRecord(payload, TASK_ACTIVITY_PATH);
	const activitiesPayload = row.activities;
	if (!Array.isArray(activitiesPayload)) {
		throw new Error(
			`Invalid ${TASK_ACTIVITY_PATH} response field 'activities'`,
		);
	}
	return {
		taskId: readString(row, "taskId", TASK_ACTIVITY_PATH),
		activities: activitiesPayload.map(parseTaskActivityRecord),
	};
}

function parseTaskActivityRecord(payload: unknown): TaskActivityRecord {
	const row = assertObjectRecord(payload, TASK_ACTIVITY_PATH);
	return {
		id: readString(row, "id", TASK_ACTIVITY_PATH),
		kind: readTaskActivityKind(row.kind),
		actorId: readString(row, "actorId", TASK_ACTIVITY_PATH),
		actorType: readString(row, "actorType", TASK_ACTIVITY_PATH),
		title: readString(row, "title", TASK_ACTIVITY_PATH),
		body: readString(row, "body", TASK_ACTIVITY_PATH),
		status: readNullableString(row, "status", TASK_ACTIVITY_PATH),
		createdAt: readString(row, "createdAt", TASK_ACTIVITY_PATH),
		steps:
			row.steps === undefined ? undefined : parseTaskActivitySteps(row.steps),
	};
}

function parseTaskActivitySteps(payload: unknown): TaskActivityStepRecord[] {
	if (!Array.isArray(payload)) {
		throw new Error(`Invalid ${TASK_ACTIVITY_PATH} response field 'steps'`);
	}
	return payload.map((stepPayload) => {
		const step = assertObjectRecord(stepPayload, TASK_ACTIVITY_PATH);
		return {
			id: readString(step, "id", TASK_ACTIVITY_PATH),
			stepNumber: readNumber(step, "stepNumber", TASK_ACTIVITY_PATH),
			action: readString(step, "action", TASK_ACTIVITY_PATH),
			status: readString(step, "status", TASK_ACTIVITY_PATH),
			detail: readNullableString(step, "detail", TASK_ACTIVITY_PATH),
			recordedAt: readString(step, "recordedAt", TASK_ACTIVITY_PATH),
		};
	});
}

function readTaskActivityKind(value: unknown): TaskActivityRecord["kind"] {
	if (value === "comment" || value === "created" || value === "execution") {
		return value;
	}
	throw new Error(`Invalid ${TASK_ACTIVITY_PATH} response field 'kind'`);
}
