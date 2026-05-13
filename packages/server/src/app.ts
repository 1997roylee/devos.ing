import type { AppDeps, RouteHandler } from "./app.types";
import { ensureMethod, matchesPath, parseJsonBody } from "./http/request";
import {
	jsonError,
	jsonSuccess,
	methodNotAllowedResponse,
	notFoundResponse,
} from "./http/response";
import {
	validateObjectBody,
	validateRequiredNonEmptyString,
} from "./http/validation";

const UNSAFE_RAW_COMMAND_FIELDS = ["command", "cmd", "args", "argv", "shell"];

export function createHandleRequest(deps: AppDeps): RouteHandler {
	return async (request) => {
		if (matchesPath(request, "/health")) {
			const methodResult = ensureMethod(request, "GET");
			if (methodResult.status === "error") {
				return methodResult.response;
			}
			return jsonSuccess({ status: "ok" });
		}

		if (matchesPath(request, "/api/cli/history")) {
			const methodResult = ensureMethod(request, "GET");
			if (methodResult.status === "error") {
				return methodResult.response;
			}
			return jsonSuccess(deps.cliExecutor.getHistory());
		}

		if (matchesPath(request, "/api/cli/dispatch")) {
			const methodResult = ensureMethod(request, "POST");
			if (methodResult.status === "error") {
				return methodResult.response;
			}
			const parsed = await parseDispatchRequest(request);
			if (parsed.status === "error") {
				return jsonError(parsed.error, { status: 400 });
			}
			const result = await deps.cliExecutor.execute(parsed.request);
			return jsonSuccess(result, {
				status: result.status === "rejected" ? 400 : 200,
			});
		}

		return notFoundResponse();
	};
}

export const handleRequest: RouteHandler = (request) => {
	if (matchesPath(request, "/health")) {
		if (request.method !== "GET") {
			return methodNotAllowedResponse();
		}
		return jsonSuccess({ status: "ok" });
	}

	return notFoundResponse();
};

async function parseDispatchRequest(
	request: Request,
): Promise<
	| { status: "ok"; request: Record<string, unknown> & { action: string } }
	| { status: "error"; error: string }
> {
	const bodyResult = await parseJsonBody(request);
	if (bodyResult.status === "error") {
		return bodyResult;
	}

	const objectBody = validateObjectBody(
		bodyResult.value,
		"Malformed dispatch request: expected object body",
	);
	if (objectBody.status === "error") {
		return objectBody;
	}

	const actionValidation = validateRequiredNonEmptyString(
		objectBody.value.action,
		"Malformed dispatch request: action must be a non-empty string",
	);
	if (actionValidation.status === "error") {
		return actionValidation;
	}

	for (const field of UNSAFE_RAW_COMMAND_FIELDS) {
		if (field in objectBody.value) {
			return {
				status: "error",
				error: `Unsafe dispatch request: raw command field '${field}' is not allowed`,
			};
		}
	}

	return {
		status: "ok",
		request: objectBody.value as Record<string, unknown> & { action: string },
	};
}
