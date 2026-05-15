import type { CreatedLinearIssueRef } from "../../integrations/linear";

export interface TaskIntakeAnswer {
	question: string;
	answer: string;
}

export interface TaskIntakeTask {
	title: string;
	description: string;
}

export type TaskIntakeDecision =
	| { result: "CLEAR"; task: TaskIntakeTask }
	| { result: "NEEDS_INFO"; questions: string[] };

export interface TaskIntakeLinearClient {
	createBacklogTask(input: TaskIntakeTask): Promise<CreatedLinearIssueRef>;
}

export interface RunTaskIntakeOptions {
	request: string;
	maxClarificationRounds?: number;
	initialAnswers?: TaskIntakeAnswer[];
	providedAnswers?: TaskIntakeAnswer[];
	allowInteractiveQuestions?: boolean;
	nonInteractive?: boolean;
	askQuestion(question: string): Promise<string>;
}

export type TaskIntakeRunResult =
	| {
			status: "created";
			issue: CreatedLinearIssueRef;
			task: TaskIntakeTask;
	  }
	| { status: "needs_info"; questions: string[] };
