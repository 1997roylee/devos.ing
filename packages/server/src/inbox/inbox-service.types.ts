import type {
	CreateInboxMessageInput,
	InboxMessageRecord,
	InboxMessageScope,
	InboxRepository,
} from "./inbox.types";

export type InboxServiceResult<T> =
	| { status: "ok"; value: T }
	| { status: "foreign_key_error" }
	| { status: "invalid_payload" };

export interface InboxService {
	listInboxMessages(
		scope: InboxMessageScope,
	): Promise<InboxServiceResult<InboxMessageRecord[]>>;
	createInboxMessage(
		input: CreateInboxMessageInput,
	): Promise<InboxServiceResult<InboxMessageRecord>>;
}

export type { InboxRepository };
