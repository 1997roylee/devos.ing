import { isForeignKeyError } from "../http/http-utils";
import type {
	InboxRepository,
	InboxService,
	InboxServiceResult,
} from "./inbox-service.types";

export function createInboxService(repository: InboxRepository): InboxService {
	return {
		async listInboxMessages(scope) {
			return {
				status: "ok",
				value: await repository.listInboxMessages(scope),
			};
		},
		async createInboxMessage(input) {
			try {
				return {
					status: "ok",
					value: await repository.createInboxMessage(input),
				};
			} catch (error) {
				return mapInboxMutationError(error);
			}
		},
	};
}

function mapInboxMutationError(error: unknown): InboxServiceResult<never> {
	return isForeignKeyError(error)
		? { status: "foreign_key_error" }
		: { status: "invalid_payload" };
}
