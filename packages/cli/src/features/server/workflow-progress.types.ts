import type { AgentChatLogRole, PlannedSplitTask } from "../types";

export const WORKFLOW_PROGRESS_SCHEMA = "devos.workflow.stream.v1";

export type WorkflowProgressStatus =
	| "started"
	| "running"
	| "succeeded"
	| "failed"
	| "blocked";

export type WorkflowCheckpointStatus =
	| "pending"
	| "running"
	| "succeeded"
	| "failed"
	| "blocked";

export interface WorkflowProgressBase {
	schema: typeof WORKFLOW_PROGRESS_SCHEMA;
	emittedAt: string;
	projectId?: string;
	issueKey?: string;
	stage?: string;
}

export interface WorkflowStageProgressEvent extends WorkflowProgressBase {
	kind: "stage";
	status: WorkflowProgressStatus;
	summary?: string;
}

export interface WorkflowCheckpointProgressEvent extends WorkflowProgressBase {
	kind: "checkpoint";
	title: string;
	status: WorkflowCheckpointStatus;
	detail?: string;
}

export interface WorkflowActionProgressEvent extends WorkflowProgressBase {
	kind: "action";
	action: string;
	status: WorkflowProgressStatus;
	agentRole?: AgentChatLogRole;
	detail?: string;
	error?: string;
}

export interface WorkflowSummaryProgressEvent extends WorkflowProgressBase {
	kind: "summary";
	summary?: string;
	successGoal?: string;
	testPlan?: string[];
	checkpoints?: string[];
	splitTasks?: PlannedSplitTask[];
}

export interface WorkflowLogProgressEvent extends WorkflowProgressBase {
	kind: "log";
	stream: "stdout" | "stderr" | "daemon";
	level: "info" | "warn" | "error";
	message: string;
}

export type WorkflowProgressEvent =
	| WorkflowStageProgressEvent
	| WorkflowCheckpointProgressEvent
	| WorkflowActionProgressEvent
	| WorkflowSummaryProgressEvent
	| WorkflowLogProgressEvent;

export type WorkflowProgressEventInput =
	| Omit<WorkflowStageProgressEvent, "schema" | "emittedAt">
	| Omit<WorkflowCheckpointProgressEvent, "schema" | "emittedAt">
	| Omit<WorkflowActionProgressEvent, "schema" | "emittedAt">
	| Omit<WorkflowSummaryProgressEvent, "schema" | "emittedAt">
	| Omit<WorkflowLogProgressEvent, "schema" | "emittedAt">;
