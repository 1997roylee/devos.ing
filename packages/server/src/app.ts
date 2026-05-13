import type { AppDeps, RouteHandler } from "./app.types";
import { parseNotificationRequest } from "./notifications/notifications-request";

const UNSAFE_RAW_COMMAND_FIELDS = ["command", "cmd", "args", "argv", "shell"];

export function createHandleRequest(deps: AppDeps): RouteHandler {
	return async (request) => {
		const { pathname } = new URL(request.url);

		if (pathname === "/health" && request.method === "GET") {
			return Response.json({ status: "ok" });
		}

		if (pathname === "/api/cli/history") {
			if (request.method !== "GET") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			return Response.json(deps.cliExecutor.getHistory());
		}

		if (pathname === "/api/cli/dispatch") {
			if (request.method !== "POST") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			const parsed = await parseDispatchRequest(request);
			if (parsed.status === "error") {
				return Response.json({ error: parsed.error }, { status: 400 });
			}
			const result = await deps.cliExecutor.execute(parsed.request);
			return Response.json(result, {
				status: result.status === "rejected" ? 400 : 200,
			});
		}

		if (pathname === "/api/notifications/email") {
			if (request.method !== "POST") {
				return Response.json({ error: "Method Not Allowed" }, { status: 405 });
			}
			const parsed = await parseNotificationRequest(request);
			if (parsed.status === "error") {
				return Response.json({ error: parsed.error }, { status: 400 });
			}
			const result = await deps.notificationService.send(parsed.request);
			if (result.status === "config_error") {
				return Response.json({ error: result.error }, { status: 503 });
			}
			if (result.status === "send_error") {
				return Response.json({ error: result.error }, { status: 502 });
			}
			return Response.json({ status: "sent" }, { status: 200 });
		}

		return new Response("Not Found", { status: 404 });
	};
}

export const handleRequest: RouteHandler = (request) => {
	const { pathname } = new URL(request.url);

	if (pathname === "/health" && request.method === "GET") {
		return Response.json({ status: "ok" });
	}

	return new Response("Not Found", { status: 404 });
};

async function parseDispatchRequest(
	request: Request,
): Promise<
	| { status: "ok"; request: Record<string, unknown> & { action: string } }
	| { status: "error"; error: string }
> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { status: "error", error: "Malformed JSON body" };
	}

	if (!isRecord(body)) {
		return {
			status: "error",
			error: "Malformed dispatch request: expected object body",
		};
	}
	if (typeof body.action !== "string" || body.action.trim().length === 0) {
		return {
			status: "error",
			error: "Malformed dispatch request: action must be a non-empty string",
		};
	}
	for (const field of UNSAFE_RAW_COMMAND_FIELDS) {
		if (field in body) {
			return {
				status: "error",
				error: `Unsafe dispatch request: raw command field '${field}' is not allowed`,
			};
		}
	}

	return {
		status: "ok",
		request: body as Record<string, unknown> & { action: string },
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
