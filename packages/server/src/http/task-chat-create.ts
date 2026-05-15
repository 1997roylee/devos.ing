import { z } from "zod";
import type { CliExecutor } from "../app.types";
import type { ServerDatabase } from "../db";
import {
	composeTaskChatCreate,
	runTaskIntake,
} from "../tasks/task-chat-service";
import {
	badRequest,
	methodNotAllowed,
	parseObjectJsonBody,
} from "./http-utils";
import { jsonSuccess } from "./response";

const answerSchema = z.object({
	question: z.string().trim().min(1),
	answer: z.string().trim().min(1),
});

const requestSchema = z.object({
	request: z.string().trim().min(1),
	projectId: z.string().trim().min(1).optional(),
	answers: z.array(answerSchema).optional(),
});

export async function handleTaskChatCreateRoute(
	request: Request,
	_db: ServerDatabase["db"],
	cliExecutor: CliExecutor,
): Promise<Response> {
	if (request.method !== "POST") {
		return methodNotAllowed();
	}
	const parsedBody = await parseObjectJsonBody(request);
	if (!parsedBody.ok) {
		return badRequest(parsedBody.error);
	}
	const parsed = requestSchema.safeParse(parsedBody.value);
	if (!parsed.success) {
		return badRequest("Invalid chat task create payload");
	}
	const result = await composeTaskChatCreate(parsed.data, {
		runTaskIntake: (input) => runTaskIntake(cliExecutor, input),
	});
	return jsonSuccess(result);
}
