import type { AgentAdapter } from "../agent-adapters";
import { createAgentAdapter } from "../agent-adapters";
import {
	commentOnPr,
	createDraftPrFromWorktree,
	ensureBaseBranchFresh,
	findOpenPullRequestForIssue,
	markPrReadyForReview,
	prepareImplementationBranch,
	squashMergePullRequest,
	updateDraftPrFromWorktree,
} from "../services/github";
import { LinearClient } from "../services/linear";
import {
	sendHumanReviewRequiredEmail,
	sendTaskOutcomeEmail,
} from "../services/notifications";
import type {
	PullRequestRef,
	ResolvedNotificationEmailConfig,
	ResolvedProjectConfig,
	RunState,
} from "./types";

export type WorkflowLinearClient = Pick<
	LinearClient,
	| "fetchWork"
	| "fetchIssueByIdentifier"
	| "fetchReviewOnlyWork"
	| "isAssignedState"
	| "markStage"
	| "markCanceled"
	| "updateIssueDetails"
	| "createTodoIssueFromPlan"
	| "applyStageLabel"
	| "clearWorkflowStageLabels"
	| "comment"
>;

export interface WorkflowRuntime {
	createLinearClient(config: ResolvedProjectConfig): WorkflowLinearClient;
	createAgentAdapter(config: ResolvedProjectConfig): AgentAdapter;
	ensureBaseBranchFresh(config: ResolvedProjectConfig): Promise<void>;
	findOpenPullRequestForIssue(
		config: ResolvedProjectConfig,
		issueKey: string,
	): Promise<PullRequestRef | undefined>;
	prepareImplementationBranch(
		config: ResolvedProjectConfig,
		issueKey: string,
		pullRequest: PullRequestRef | undefined,
	): Promise<string>;
	createDraftPrFromWorktree(
		config: ResolvedProjectConfig,
		issueKey: string,
		issueTitle: string,
	): Promise<PullRequestRef>;
	updateDraftPrFromWorktree(
		config: ResolvedProjectConfig,
		prBranch: string,
		issueKey: string,
	): Promise<boolean>;
	commentOnPr(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
		body: string,
	): Promise<void>;
	markPrReadyForReview(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
	): Promise<boolean>;
	squashMergePullRequest(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
	): Promise<boolean>;
	sendTaskOutcomeEmail(
		email: ResolvedNotificationEmailConfig,
		state: RunState,
		outcome: "done" | "blocked",
		errorMessage?: string,
	): Promise<void>;
	sendHumanReviewRequiredEmail(
		email: ResolvedNotificationEmailConfig,
		state: RunState,
		input: { complexityScore: number; reason: string },
	): Promise<void>;
}

export function createWorkflowRuntime(
	overrides: Partial<WorkflowRuntime> = {},
): WorkflowRuntime {
	return {
		createLinearClient: (config) => new LinearClient(config),
		createAgentAdapter,
		ensureBaseBranchFresh,
		findOpenPullRequestForIssue,
		prepareImplementationBranch,
		createDraftPrFromWorktree,
		updateDraftPrFromWorktree,
		commentOnPr,
		markPrReadyForReview,
		squashMergePullRequest,
		sendTaskOutcomeEmail,
		sendHumanReviewRequiredEmail,
		...overrides,
	};
}
