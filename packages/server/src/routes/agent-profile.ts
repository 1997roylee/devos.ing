import type { AgentRow } from "../db";
import type {
	AgentCreatePayload,
	AgentProfile,
	AgentProfileInsert,
	AgentUpdatePayload,
} from "./agent-profile.types";

const STRING_FIELDS = [
	"title",
	"description",
	"logo",
	"runtime",
	"model",
	"owner",
	"createdAt",
	"updatedAt",
	"instructions",
] as const;
const LIST_FIELDS = ["skills", "recentWork", "activity"] as const;
const CREATE_FIELDS = ["id", ...STRING_FIELDS, "concurrency", ...LIST_FIELDS];
const UPDATE_FIELDS = [...STRING_FIELDS, "concurrency", ...LIST_FIELDS];

type ValidationResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: string };

export function serializeAgentProfile(
	profile: AgentCreatePayload | AgentUpdatePayload,
): AgentProfileInsert | Partial<AgentProfileInsert> {
	const values: Partial<AgentProfileInsert> = {};
	for (const [key, value] of Object.entries(profile)) {
		if (!LIST_FIELDS.includes(key as (typeof LIST_FIELDS)[number])) {
			values[key as keyof AgentProfileInsert] = value as never;
		}
	}
	for (const field of LIST_FIELDS) {
		if (field in profile && profile[field] !== undefined) {
			values[field] = JSON.stringify(profile[field]);
		}
	}
	return values;
}

export function serializeAgentCreatePayload(
	profile: AgentCreatePayload,
): AgentProfileInsert {
	return serializeAgentProfile(profile) as AgentProfileInsert;
}

export function serializeAgentUpdatePayload(
	profile: AgentUpdatePayload,
): Partial<AgentProfileInsert> {
	return serializeAgentProfile(profile);
}

export function toAgentProfile(row: AgentRow): AgentProfile {
	return {
		...row,
		skills: parseListField(row.skills),
		recentWork: parseListField(row.recentWork),
		activity: parseListField(row.activity),
	};
}

export function validateAgentCreatePayload(
	value: unknown,
): ValidationResult<AgentCreatePayload> {
	const base = validateRecord(value, CREATE_FIELDS, false);
	if (!base.ok) {
		return base;
	}
	return { ok: true, value: base.value as unknown as AgentCreatePayload };
}

export function validateAgentUpdatePayload(
	value: unknown,
): ValidationResult<AgentUpdatePayload> {
	const base = validateRecord(value, UPDATE_FIELDS, true);
	if (!base.ok) {
		return base;
	}
	return { ok: true, value: base.value as AgentUpdatePayload };
}

function validateRecord(
	value: unknown,
	allowedFields: readonly string[],
	partial: boolean,
): ValidationResult<Record<string, unknown>> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return { ok: false, error: "Malformed request: expected object body" };
	}
	const record = value as Record<string, unknown>;
	const keys = Object.keys(record);
	if (partial && keys.length === 0) {
		return {
			ok: false,
			error: "Malformed request: expected at least one field",
		};
	}
	for (const key of keys) {
		if (!allowedFields.includes(key)) {
			return { ok: false, error: `Malformed request: unknown field '${key}'` };
		}
	}
	if (!partial) {
		for (const field of allowedFields) {
			if (!(field in record)) {
				return {
					ok: false,
					error: `Malformed request: missing required field '${field}'`,
				};
			}
		}
	}
	return validateFieldValues(record);
}

function validateFieldValues(
	record: Record<string, unknown>,
): ValidationResult<Record<string, unknown>> {
	for (const field of STRING_FIELDS) {
		if (field in record && !isNonEmptyString(record[field])) {
			return nonEmptyStringError(field);
		}
	}
	if ("id" in record && !isNonEmptyString(record.id)) {
		return nonEmptyStringError("id");
	}
	if ("concurrency" in record && !isPositiveInteger(record.concurrency)) {
		return {
			ok: false,
			error:
				"Malformed request: field 'concurrency' must be a positive integer",
		};
	}
	for (const field of LIST_FIELDS) {
		if (field in record && !isStringList(record[field])) {
			return {
				ok: false,
				error: `Malformed request: field '${field}' must be a string array`,
			};
		}
	}
	return { ok: true, value: record };
}

function parseListField(value: string): string[] {
	const parsed = JSON.parse(value) as unknown;
	return Array.isArray(parsed)
		? parsed.filter((item): item is string => typeof item === "string")
		: [];
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
	return Number.isInteger(value) && Number(value) > 0;
}

function isStringList(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function nonEmptyStringError(field: string): ValidationResult<never> {
	return {
		ok: false,
		error: `Malformed request: field '${field}' must be a non-empty string`,
	};
}
