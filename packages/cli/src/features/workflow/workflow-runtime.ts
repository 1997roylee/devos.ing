import { createAgentAdapter } from "../../integrations/agent-adapters";
import {
	commentOnPr,
	createDraftPrFromWorktree,
	ensureBaseBranchFresh,
	ensureIssueWorktree,
	findOpenPullRequestForIssue,
	getPullRequestMergeStatus,
	markPrReadyForReview,
	prepareImplementationBranch,
	removeIssueWorktree,
	squashMergePullRequest,
	updateDraftPrFromWorktree,
} from "../../integrations/github";
import { LinearClient } from "../../integrations/linear";
import {
	sendHumanReviewRequiredEmail,
	sendTaskOutcomeEmail,
} from "../../integrations/notifications";
import type { WorkflowRuntime } from "./workflow.types";
export type { WorkflowLinearClient, WorkflowRuntime } from "./workflow.types";

export function createWorkflowRuntime(
	overrides: Partial<WorkflowRuntime> = {},
): WorkflowRuntime {
	return {
		createLinearClient: (config) => new LinearClient(config),
		createAgentAdapter: createAgentAdapter,
		ensureBaseBranchFresh,
		ensureIssueWorktree,
		findOpenPullRequestForIssue,
		getPullRequestMergeStatus,
		prepareImplementationBranch,
		removeIssueWorktree,
		createDraftPrFromWorktree,
		updateDraftPrFromWorktree,
		commentOnPr,
		markPrReadyForReview,
		squashMergePullRequest,
		sendTaskOutcomeEmail: sendTaskOutcomeEmail,
		sendHumanReviewRequiredEmail: sendHumanReviewRequiredEmail,
		...overrides,
	};
}
