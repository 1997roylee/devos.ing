import type { TaskCreateResponse } from "@/lib/api";

export function formatTaskCreateError(
	response: Exclude<TaskCreateResponse, { status: "created" | "needs_info" }>,
): string {
	if (response.status === "linear_error") {
		return `Linear task creation failed: ${response.error}`;
	}
	if (response.status === "db_error") {
		return `Board task creation failed after ${response.issue.identifier}: ${response.error}`;
	}
	return `Board task link failed after ${response.issue.identifier}: ${response.error}`;
}
