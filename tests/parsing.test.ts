import { describe, expect, it } from "bun:test";
import {
	extractFinalMessage,
	extractSessionId,
	extractUsage,
} from "../src/utils/parsing";

describe("extractSessionId", () => {
	it("extracts session_id from JSON", () => {
		const output = JSON.stringify({ session_id: "abc-123" });
		expect(extractSessionId(output)).toBe("abc-123");
	});

	it("extracts sessionId from JSON (camelCase)", () => {
		const output = JSON.stringify({ sessionId: "def-456" });
		expect(extractSessionId(output)).toBe("def-456");
	});

	it("extracts conversation_id from nested JSON", () => {
		const output = JSON.stringify({
			data: { nested: { conversation_id: "xyz-789" } },
		});
		expect(extractSessionId(output)).toBe("xyz-789");
	});

	it("handles JSONL with multiple lines", () => {
		const output =
			'{"event":"log"}\n{"event":"log"}\n{"session_id":"session-1"}';
		expect(extractSessionId(output)).toBe("session-1");
	});

	it("returns undefined for empty input", () => {
		expect(extractSessionId("")).toBeUndefined();
		expect(extractSessionId("   ")).toBeUndefined();
	});

	it("returns undefined for malformed JSON", () => {
		expect(extractSessionId("{invalid}")).toBeUndefined();
	});

	it("returns undefined when no session key exists", () => {
		const output = JSON.stringify({ foo: "bar" });
		expect(extractSessionId(output)).toBeUndefined();
	});
});

describe("extractUsage", () => {
	it("extracts full usage from JSON", () => {
		const output = JSON.stringify({
			usage: {
				input_tokens: 100,
				output_tokens: 200,
				total_tokens: 300,
			},
		});
		expect(extractUsage(output)).toEqual({
			inputTokens: 100,
			outputTokens: 200,
			totalTokens: 300,
		});
	});

	it("handles camelCase token keys", () => {
		const output = JSON.stringify({
			usage: { inputTokens: 50, outputTokens: 75 },
		});
		expect(extractUsage(output)).toEqual({
			inputTokens: 50,
			outputTokens: 75,
			totalTokens: 125,
		});
	});

	it("handles prompt/completion token keys", () => {
		const output = JSON.stringify({
			usage: { prompt_tokens: 30, completion_tokens: 40 },
		});
		expect(extractUsage(output)).toEqual({
			inputTokens: 30,
			outputTokens: 40,
			totalTokens: 70,
		});
	});

	it("returns latest usage from JSONL", () => {
		const output =
			'{"usage":{"input_tokens":10,"output_tokens":20}}\n{"usage":{"input_tokens":50,"output_tokens":60}}';
		expect(extractUsage(output)).toEqual({
			inputTokens: 50,
			outputTokens: 60,
			totalTokens: 110,
		});
	});

	it("calculates total when missing", () => {
		const output = JSON.stringify({
			usage: { inputTokens: 100, outputTokens: 200 },
		});
		expect(extractUsage(output)).toEqual({
			inputTokens: 100,
			outputTokens: 200,
			totalTokens: 300,
		});
	});

	it("returns undefined for empty usage", () => {
		const output = JSON.stringify({ foo: "bar" });
		expect(extractUsage(output)).toBeUndefined();
	});

	it("returns undefined for malformed JSON", () => {
		expect(extractUsage("{invalid}")).toBeUndefined();
	});

	it("handles partial usage data", () => {
		const output = JSON.stringify({ usage: { inputTokens: 100 } });
		expect(extractUsage(output)).toEqual({
			inputTokens: 100,
			outputTokens: undefined,
			totalTokens: 100,
		});
	});

	it("skips malformed JSONL lines", () => {
		const output =
			'{"usage":{"input_tokens":10}}\n{invalid}\n{"usage":{"output_tokens":20}}';
		expect(extractUsage(output)).toEqual({
			outputTokens: 20,
			totalTokens: 20,
		});
	});
});

describe("extractFinalMessage", () => {
	it("extracts result field", () => {
		const output = JSON.stringify({ result: "Plan generated successfully" });
		expect(extractFinalMessage(output)).toBe("Plan generated successfully");
	});

	it("extracts content field", () => {
		const output = JSON.stringify({ content: "Implementation done" });
		expect(extractFinalMessage(output)).toBe("Implementation done");
	});

	it("extracts message field", () => {
		const output = JSON.stringify({ message: "Review completed" });
		expect(extractFinalMessage(output)).toBe("Review completed");
	});

	it("extracts last message from messages array", () => {
		const output = JSON.stringify({
			messages: [
				{ content: "First" },
				{ content: "Second" },
				{ content: "Third" },
			],
		});
		expect(extractFinalMessage(output)).toBe("Third");
	});

	it("returns original string for malformed JSON", () => {
		const input = "plain text output";
		expect(extractFinalMessage(input)).toBe("plain text output");
	});

	it("returns empty string for empty input", () => {
		expect(extractFinalMessage("")).toBe("");
	});

	it("returns empty string for whitespace input", () => {
		expect(extractFinalMessage("   ")).toBe("   ");
	});
});
