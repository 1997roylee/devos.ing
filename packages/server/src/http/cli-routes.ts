import type { CliExecutor } from "../app.types";
import { methodNotAllowed } from "./http-utils";

const UNSAFE_RAW_COMMAND_FIELDS = ["command", "cmd", "args", "argv", "shell"];

export async function handleCliRoute(
	request: Request,
	cliExecutor: CliExecutor,
	pathname: string,
): Promise<Response | null> {
	if (pathname === "/api/cli/history") {
		if (request.method !== "GET") {
			return methodNotAllowed();
		}
		return Response.json(cliExecutor.getHistory());
	}

	if (pathname === "/api/cli/dispatch") {
		if (request.method !== "POST") {
			return methodNotAllowed();
		}
		const parsed = await parseDispatchRequest(request);
		if (parsed.status === "error") {
			return Response.json({ error: parsed.error }, { status: 400 });
		}
		const result = await cliExecutor.execute(parsed.request);
		return Response.json(result, {
			status: result.status === "rejected" ? 400 : 200,
		});
	}

	return null;
}

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
