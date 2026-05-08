/**
 * Shared JSON/JSONL parsing utilities for agent adapters and other modules.
 * Consolidates duplicate extraction logic from Codex and Claude Code adapters.
 */

import type { AgentAdapter, AgentResult } from "../core/agent-adapter";

const SESSION_ID_KEYS = [
	"session_id",
	"sessionId",
	"thread_id",
	"threadId",
	"conversation_id",
	"conversationId",
] as const;

const INPUT_TOKEN_KEYS = [
	"input_tokens",
	"inputTokens",
	"prompt_tokens",
	"promptTokens",
] as const;

const OUTPUT_TOKEN_KEYS = [
	"output_tokens",
	"outputTokens",
	"completion_tokens",
	"completionTokens",
] as const;

const TOTAL_TOKEN_KEYS = ["total_tokens", "totalTokens"] as const;

const FINAL_MESSAGE_KEYS = ["result", "content", "message"] as const;

/**
 * Extract session ID from JSON or JSONL output.
 * Searches common key names and nested objects.
 */
export function extractSessionId(output: string): string | undefined {
	if (!output?.trim()) {
		return undefined;
	}

	// Handle JSONL (newline-delimited JSON)
	const lines = output.split("\n").filter(Boolean);
	for (const line of lines) {
		const id = findStringKeyInJson(line, SESSION_ID_KEYS);
		if (id) {
			return id;
		}
	}
	return undefined;
}

/**
 * Extract token usage information from JSON or JSONL output.
 * Returns the latest usage record found.
 */
export function extractUsage(output: string): AgentResult["usage"] | undefined {
	if (!output?.trim()) {
		return undefined;
	}

	// Handle JSONL (newline-delimited JSON) - take latest
	const lines = output.split("\n").filter(Boolean);
	let latestUsage: AgentResult["usage"] | undefined;

	for (const line of lines) {
		try {
			const parsed = JSON.parse(line) as unknown;
			const usage = findUsageInObject(parsed);
			if (usage) {
				latestUsage = usage;
			}
		} catch {
			// Skip malformed JSON lines
		}
	}
	return latestUsage;
}

/**
 * Extract final message content from JSON output.
 * Handles various response formats from different agent backends.
 */
export function extractFinalMessage(jsonOutput: string): string {
	if (!jsonOutput?.trim()) {
		return jsonOutput;
	}

	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;

		// Direct final message keys
		for (const key of FINAL_MESSAGE_KEYS) {
			if (typeof parsed[key] === "string") {
				return parsed[key] as string;
			}
		}

		// Messages array format (last message)
		if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
			const last = parsed.messages[parsed.messages.length - 1];
			if (
				typeof last === "object" &&
				last !== null &&
				typeof last.content === "string"
			) {
				return last.content;
			}
		}
	} catch {
		// Return original if JSON parsing fails
	}

	return jsonOutput;
}

function findUsageInObject(value: unknown): AgentResult["usage"] | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	const record = value as Record<string, unknown>;
	const usage = buildUsageFromRecord(record);
	if (usage) {
		return usage;
	}

	// Recursively search nested objects
	for (const nested of Object.values(record)) {
		const found = findUsageInObject(nested);
		if (found) {
			return found;
		}
	}
	return undefined;
}

function buildUsageFromRecord(
	record: Record<string, unknown>,
): AgentResult["usage"] | undefined {
	const inputTokens = findNumberKeyInRecord(record, INPUT_TOKEN_KEYS);
	const outputTokens = findNumberKeyInRecord(record, OUTPUT_TOKEN_KEYS);
	const totalTokens = findNumberKeyInRecord(record, TOTAL_TOKEN_KEYS);

	if (
		inputTokens === undefined &&
		outputTokens === undefined &&
		totalTokens === undefined
	) {
		return undefined;
	}

	return {
		inputTokens,
		outputTokens,
		totalTokens:
			totalTokens ??
			(inputTokens !== undefined || outputTokens !== undefined
				? (inputTokens ?? 0) + (outputTokens ?? 0)
				: undefined),
	};
}

function findStringKeyInJson(
	jsonString: string,
	keys: readonly string[],
): string | undefined {
	try {
		const parsed = JSON.parse(jsonString) as unknown;
		return findStringKeyInObject(parsed, keys);
	} catch {
		return undefined;
	}
}

function findStringKeyInObject(
	value: unknown,
	keys: readonly string[],
): string | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	const record = value as Record<string, unknown>;

	// Check top-level keys
	for (const key of keys) {
		const candidate = record[key];
		if (typeof candidate === "string" && candidate.length > 0) {
			return candidate;
		}
	}

	// Recursively search nested objects
	for (const nested of Object.values(record)) {
		const found = findStringKeyInObject(nested, keys);
		if (found) {
			return found;
		}
	}
	return undefined;
}

function findNumberKeyInRecord(
	record: Record<string, unknown>,
	keys: readonly string[],
): number | undefined {
	for (const key of keys) {
		const candidate = record[key];
		if (typeof candidate === "number" && Number.isFinite(candidate)) {
			return candidate;
		}
	}
	return undefined;
}
