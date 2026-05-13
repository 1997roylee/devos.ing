import type {
	CodexUsageRecord,
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../types";
import type { readyPullRequestAfterPassingReview } from "./review-stage-helpers";

export interface HandleReviewTestingStageDeps {
	runAgentWithChatLog: (input: {
		workspacePath: string;
		projectId: string;
		issue: RunState["issue"];
		agentRole: "review-testing" | "github-comment";
		skillPath: string;
		prompt: string;
		invoke: () => Promise<{
			finalMessage: string;
			stdout: string;
			sessionId?: string;
			usage?: {
				inputTokens?: number;
				outputTokens?: number;
				totalTokens?: number;
			};
		}>;
	}) => Promise<{
		finalMessage: string;
		stdout: string;
		sessionId?: string;
		usage?: {
			inputTokens?: number;
			outputTokens?: number;
			totalTokens?: number;
		};
	}>;
	appendCodexUsage: (
		state: RunState,
		stage: CodexUsageRecord["stage"],
		usage:
			| { inputTokens?: number; outputTokens?: number; totalTokens?: number }
			| undefined,
	) => void;
	transitionStage: (state: RunState, to: RunState["stage"]) => RunState;
	saveRunState: (cwd: string, state: RunState) => Promise<void>;
	safePrComment: (
		config: ResolvedProjectConfig,
		state: RunState,
		body: string,
	) => Promise<void>;
	safeNotifyHumanReviewRequired?: (
		state: RunState,
		reason: string,
	) => Promise<void>;
	readyPullRequestAfterPassingReview?: typeof readyPullRequestAfterPassingReview;
	loggerInfo: (fields: Record<string, unknown>, message: string) => void;
	buildIssueJobLogFields: (
		state: RunState,
		stage: string,
		options?: { resumed?: boolean },
	) => Record<string, unknown>;
}

export interface FinalizeReviewMergeDeps {
	saveRunState: (cwd: string, state: RunState) => Promise<void>;
	safeNotifyTaskOutcome: (
		notifications: ResolvedNotificationConfig,
		state: RunState,
		outcome: "done" | "blocked",
		errorMessage?: string,
	) => Promise<void>;
}

export interface ReviewLinearClient {
	markStage(issueId: string, stage: string): Promise<void>;
	applyStageLabel(issueId: string, stage: string): Promise<void>;
	clearWorkflowStageLabels(issueId: string): Promise<void>;
	comment(issueId: string, body: string): Promise<void>;
}
