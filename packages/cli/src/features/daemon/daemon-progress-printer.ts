import { parseWorkflowProgressLine } from "../server";
import type { WorkflowProgressEvent } from "../server";

export interface DaemonProgressPrinter {
	push(text: string): void;
	flush(): void;
}

export function createDaemonProgressPrinter(
	write: (message: string) => void,
): DaemonProgressPrinter {
	let buffer = "";

	const handleLine = (line: string): void => {
		const parsed = parseWorkflowProgressLine(line.trimEnd());
		if (parsed.status === "ignored") {
			write(line);
			return;
		}
		if (parsed.status === "error") {
			write(`progress: malformed workflow event: ${parsed.error}\n`);
			return;
		}
		const formatted = formatWorkflowProgressForDaemon(parsed.event);
		if (formatted) {
			write(`${formatted}\n`);
		}
	};

	return {
		push(text) {
			buffer += text;
			while (true) {
				const newlineIndex = buffer.indexOf("\n");
				if (newlineIndex < 0) {
					break;
				}
				const line = buffer.slice(0, newlineIndex + 1);
				buffer = buffer.slice(newlineIndex + 1);
				handleLine(line);
			}
		},
		flush() {
			if (!buffer) {
				return;
			}
			handleLine(buffer);
			buffer = "";
		},
	};
}

export function formatWorkflowProgressForDaemon(
	event: WorkflowProgressEvent,
): string | undefined {
	if (event.kind === "action") {
		if (event.stage === "polling") {
			return formatPollingAction(event);
		}
		if (event.action === "issue") {
			return formatIssueAction(event);
		}
		if (event.action === "agent") {
			const role = event.agentRole ?? event.stage ?? "agent";
			return `agent: ${event.issueKey ?? "unknown"} ${role} ${formatStatus(event.status)}`;
		}
		if (event.action === "workflow") {
			return formatWorkflowAction(event);
		}
	}
	if (event.kind === "stage") {
		return `workflow: ${event.issueKey ?? "unknown"} ${event.stage ?? "stage"} ${formatStatus(event.status)}`;
	}
	if (event.kind === "log" && event.stream === "daemon") {
		return `progress: ${event.level}: ${event.message}`;
	}
	return undefined;
}

function formatPollingAction(
	event: Extract<WorkflowProgressEvent, { kind: "action" }>,
): string {
	const project = event.projectId ?? "unknown";
	if (event.action === "cycle_started") {
		return `polling: project ${project} ${event.detail ?? "cycle started"}`;
	}
	if (event.action === "cycle_fetched") {
		return `polling: project ${project} ${event.detail ?? "fetched work"}`;
	}
	if (event.action === "cycle_no_work") {
		return `polling: project ${project} ${event.detail ?? "no eligible issues"}`;
	}
	if (event.action === "cycle_completed") {
		return `polling: project ${project} ${event.detail ?? "cycle completed"}`;
	}
	if (event.action === "cycle_failed") {
		return `polling: project ${project} ${event.detail ?? "cycle failed"}${formatError(event.error)}`;
	}
	return `polling: project ${project} ${event.action} ${formatStatus(event.status)}`;
}

function formatIssueAction(
	event: Extract<WorkflowProgressEvent, { kind: "action" }>,
): string {
	const issue = event.issueKey ?? "unknown";
	if (event.status === "started") {
		return `workflow: ${issue} taken at stage ${event.stage ?? "unknown"}`;
	}
	if (event.status === "blocked") {
		return `workflow: ${issue} skipped at stage ${event.stage ?? "unknown"}${event.detail ? `: ${event.detail}` : ""}`;
	}
	return `workflow: ${issue} ${formatStatus(event.status)} at stage ${event.stage ?? "unknown"}`;
}

function formatWorkflowAction(
	event: Extract<WorkflowProgressEvent, { kind: "action" }>,
): string {
	const issue = event.issueKey ?? "unknown";
	if (event.status === "succeeded") {
		return `workflow: ${issue} completed at stage ${event.stage ?? "done"}`;
	}
	if (event.status === "failed") {
		return `workflow: ${issue} failed at stage ${event.stage ?? "unknown"}${formatError(event.error)}`;
	}
	return `workflow: ${issue} ${formatStatus(event.status)} at stage ${event.stage ?? "unknown"}`;
}

function formatStatus(status: string): string {
	return status === "succeeded" ? "completed" : status;
}

function formatError(error: string | undefined): string {
	return error ? `: ${error}` : "";
}
