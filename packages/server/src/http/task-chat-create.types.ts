import type { CreateTaskPayload } from "./project-task-api.types";

export interface TaskChatCreateAnswer {
	question: string;
	answer: string;
}

export interface TaskChatCreateRequest {
	request: string;
	projectId: string;
	answers?: TaskChatCreateAnswer[];
}

export interface TaskChatCreateLinearIssue {
	id: string;
	identifier: string;
	title: string;
	url: string;
}

export interface TaskChatCreateResolvedTask {
	title: string;
	description: string;
}

export type TaskChatCreateIntakeResult =
	| {
			status: "created";
			issue: TaskChatCreateLinearIssue;
			task: TaskChatCreateResolvedTask;
	  }
	| { status: "needs_info"; questions: string[] };

export type TaskChatCreateResponse =
	| {
			status: "created";
			issue: TaskChatCreateLinearIssue;
			task: CreateTaskPayload & {
				id: string;
				createdAt: string;
				updatedAt: string;
			};
	  }
	| { status: "needs_info"; questions: string[] }
	| { status: "linear_error"; error: string }
	| { status: "db_error"; error: string; issue: TaskChatCreateLinearIssue }
	| {
			status: "link_error";
			error: string;
			issue: TaskChatCreateLinearIssue;
			task: CreateTaskPayload & {
				id: string;
				createdAt: string;
				updatedAt: string;
			};
	  };
