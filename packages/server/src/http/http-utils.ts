import type { ValidationFailure, ValidationResult } from "./api-error.types";

export function methodNotAllowed(): Response {
	return Response.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function badRequest(error: string): Response {
	return Response.json({ error }, { status: 400 });
}

export function notFound(error: string): Response {
	return Response.json({ error }, { status: 404 });
}

export async function parseObjectJsonBody(
	request: Request,
): Promise<ValidationResult<Record<string, unknown>> | ValidationFailure> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { ok: false, error: "Malformed JSON body" };
	}

	if (!isRecord(body)) {
		return {
			ok: false,
			error: "Malformed request body: expected object body",
		};
	}
	return { ok: true, value: body };
}

export function readPathId(pathname: string, prefix: string): string | null {
	if (!pathname.startsWith(prefix)) {
		return null;
	}
	const id = pathname.slice(prefix.length);
	return id.length > 0 ? id : null;
}

export function requireString(
	value: unknown,
	field: string,
): ValidationResult<string> | ValidationFailure {
	if (typeof value !== "string" || value.trim().length === 0) {
		return { ok: false, error: `${field} must be a non-empty string` };
	}
	return { ok: true, value };
}

export function optionalStringOrNull(
	value: unknown,
	field: string,
): ValidationResult<string | null | undefined> | ValidationFailure {
	if (value === undefined) {
		return { ok: true, value: undefined };
	}
	if (value === null) {
		return { ok: true, value: null };
	}
	if (typeof value === "string") {
		return { ok: true, value };
	}
	return { ok: false, error: `${field} must be a string or null` };
}

export function optionalTimestampStringOrNull(
	value: unknown,
	field: string,
): ValidationResult<string | null | undefined> | ValidationFailure {
	const optional = optionalStringOrNull(value, field);
	if (!optional.ok || optional.value === undefined || optional.value === null) {
		return optional;
	}
	return Number.isNaN(Date.parse(optional.value))
		? { ok: false, error: `${field} must be a valid timestamp string or null` }
		: optional;
}

export function optionalInteger(
	value: unknown,
	field: string,
): ValidationResult<number | undefined> | ValidationFailure {
	if (value === undefined) {
		return { ok: true, value: undefined };
	}
	if (!Number.isInteger(value)) {
		return { ok: false, error: `${field} must be an integer` };
	}
	return { ok: true, value: value as number };
}

export function isForeignKeyError(error: unknown): boolean {
	const message = collectErrorText(error).toLowerCase();
	return (
		message.includes("foreign key") ||
		message.includes("violates") ||
		message.includes("constraint failed")
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectErrorText(error: unknown): string {
	if (error instanceof Error) {
		const causeText = collectErrorText(
			(error as Error & { cause?: unknown }).cause,
		);
		return `${error.message} ${causeText}`.trim();
	}
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object") {
		return JSON.stringify(error);
	}
	return String(error ?? "");
}
