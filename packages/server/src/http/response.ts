import type { ErrorResponseBody, JsonResponseOptions } from "./response.types";

export function jsonSuccess<T>(
	body: T,
	options?: JsonResponseOptions,
): Response {
	return Response.json(body, { status: options?.status ?? 200 });
}

export function jsonError(
	error: string,
	options?: JsonResponseOptions,
): Response {
	const body: ErrorResponseBody = { error };
	return Response.json(body, { status: options?.status ?? 400 });
}

export function methodNotAllowedResponse(): Response {
	return jsonError("Method Not Allowed", { status: 405 });
}

export function badRequestResponse(error: string): Response {
	return jsonError(error, { status: 400 });
}

export function notFoundJsonResponse(error = "Not Found"): Response {
	return jsonError(error, { status: 404 });
}

export function serverErrorResponse(error: string): Response {
	return jsonError(error, { status: 500 });
}

export function notFoundResponse(): Response {
	return new Response("Not Found", { status: 404 });
}
