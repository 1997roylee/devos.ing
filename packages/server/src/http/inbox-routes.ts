import type { ServerDatabase } from "../db";
import { createInboxRepository, createInboxService } from "../inbox";
import type { InboxServiceResult } from "../inbox";
import {
	badRequest,
	methodNotAllowed,
	parseObjectJsonBody,
} from "./http-utils";
import {
	parseCreateInboxMessagePayload,
	parseInboxMessageScopeInput,
} from "./inbox-message-schemas";

const INBOX_MESSAGES_PATH = "/api/inbox/messages";

export async function handleInboxMessagesRoute(
	request: Request,
	db: ServerDatabase["db"],
	pathname: string,
): Promise<Response | null> {
	if (pathname !== INBOX_MESSAGES_PATH) {
		return null;
	}
	const inboxService = createInboxService(createInboxRepository(db));

	if (request.method === "GET") {
		const url = new URL(request.url);
		const scope = parseInboxMessageScopeInput({
			workspaceId: url.searchParams.get("workspaceId"),
			userId: url.searchParams.get("userId"),
			runId: url.searchParams.get("runId"),
		});
		if (!scope.ok) {
			return badRequest(scope.error);
		}
		return mapInboxResult(await inboxService.listInboxMessages(scope.value));
	}

	if (request.method === "POST") {
		const parsedBody = await parseObjectJsonBody(request);
		if (!parsedBody.ok) {
			return badRequest(parsedBody.error);
		}
		const payload = parseCreateInboxMessagePayload(parsedBody.value);
		if (!payload.ok) {
			return badRequest(payload.error);
		}
		return mapInboxResult(
			await inboxService.createInboxMessage(payload.value),
			201,
		);
	}

	return methodNotAllowed();
}

function mapInboxResult<T>(
	result: InboxServiceResult<T>,
	successStatus = 200,
): Response {
	if (result.status === "ok") {
		return Response.json(result.value, { status: successStatus });
	}
	return badRequest(
		result.status === "foreign_key_error"
			? "Foreign key constraint failed"
			: "Invalid inbox message payload",
	);
}
