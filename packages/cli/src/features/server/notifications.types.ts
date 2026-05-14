export interface NotificationEmailPayload {
	from: string;
	to: string[];
	subject: string;
	text: string;
}

export interface TaskOutcomeNotificationServerRequest {
	type: "task-outcome";
	payload: NotificationEmailPayload;
}

export interface HumanReviewRequiredNotificationServerRequest {
	type: "human-review-required";
	payload: NotificationEmailPayload;
	complexityScore: number;
	reason: string;
}

export type NotificationServerRequest =
	| TaskOutcomeNotificationServerRequest
	| HumanReviewRequiredNotificationServerRequest;
