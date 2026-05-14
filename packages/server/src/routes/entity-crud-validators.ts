export async function parseJsonBody(
	request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
	try {
		return { ok: true, value: await request.json() };
	} catch {
		return { ok: false, error: "Malformed JSON body" };
	}
}

export function validateCreatePayload<T extends object>(
	value: unknown,
	allowedFields: readonly string[],
): { ok: true; value: T } | { ok: false; error: string } {
	if (!isRecord(value)) {
		return { ok: false, error: "Malformed request: expected object body" };
	}
	const keys = Object.keys(value);
	for (const key of keys) {
		if (!allowedFields.includes(key)) {
			return { ok: false, error: `Malformed request: unknown field '${key}'` };
		}
	}
	for (const field of allowedFields) {
		if (!(field in value)) {
			return {
				ok: false,
				error: `Malformed request: missing required field '${field}'`,
			};
		}
		if (typeof value[field] !== "string" || value[field].trim().length === 0) {
			return {
				ok: false,
				error: `Malformed request: field '${field}' must be a non-empty string`,
			};
		}
	}
	return { ok: true, value: value as T };
}

export function validateUpdatePayload<T extends object>(
	value: unknown,
	allowedFields: readonly string[],
): { ok: true; value: T } | { ok: false; error: string } {
	if (!isRecord(value)) {
		return { ok: false, error: "Malformed request: expected object body" };
	}
	const keys = Object.keys(value);
	if (keys.length === 0) {
		return {
			ok: false,
			error: "Malformed request: expected at least one field",
		};
	}
	for (const key of keys) {
		if (!allowedFields.includes(key)) {
			return { ok: false, error: `Malformed request: unknown field '${key}'` };
		}
		if (typeof value[key] !== "string" || value[key].trim().length === 0) {
			return {
				ok: false,
				error: `Malformed request: field '${key}' must be a non-empty string`,
			};
		}
	}
	return { ok: true, value: value as T };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
