import { describe, expect, it } from "bun:test";
import {
	buildDaemonActionLogContext,
	logDaemonActionReceived,
	logDaemonStreamEvent,
	logMalformedDaemonFrame,
	parseCliDaemonInboundFrame,
	serializeCliDaemonFrame,
} from "../src/features/daemon";
import type { CliCommandDaemonLogger } from "../src/features/daemon";

describe("CLI daemon action logging", () => {
	it("logs valid command actions with only safe routing fields", () => {
		const entries: LogEntry[] = [];
		const logger = createLogger(entries);

		logDaemonActionReceived(logger, "req-1", {
			action: "task",
			taskAction: "create",
			projectId: "api",
			request: "secret task body",
			clarificationAnswers: [{ question: "Token?", answer: "secret" }],
		});

		expect(entries).toEqual([
			{
				level: "info",
				context: {
					requestId: "req-1",
					action: "task",
					projectId: "api",
					taskAction: "create",
				},
				message: "CLI daemon action received",
			},
		]);
		expect(JSON.stringify(entries[0]?.context)).not.toContain("secret");
	});

	it("omits skill content and other unsafe payload fields from log context", () => {
		const context = buildDaemonActionLogContext("req-2", {
			action: "skills",
			skillsAction: "add",
			projectId: "api",
			title: "Private skill",
			description: "Description",
			content: "do not log this skill content",
		});

		expect(context).toEqual({
			requestId: "req-2",
			action: "skills",
			projectId: "api",
			skillsAction: "add",
		});
		expect(JSON.stringify(context)).not.toContain("do not log");
	});

	it("logs workflow action progress flowing through the daemon", () => {
		const entries: LogEntry[] = [];
		const logger = createLogger(entries);

		logDaemonStreamEvent(
			logger,
			"req-3",
			{ action: "run" },
			{
				type: "progress",
				event: {
					schema: "devos.workflow.stream.v1",
					emittedAt: "2026-05-16T00:00:00.000Z",
					kind: "action",
					projectId: "api",
					issueKey: "TASK-1",
					stage: "planning",
					action: "plan",
					status: "started",
				},
			},
		);

		expect(entries).toEqual([
			{
				level: "info",
				context: {
					requestId: "req-3",
					requestAction: "run",
					projectId: "api",
					issueKey: "TASK-1",
					stage: "planning",
					action: "plan",
					status: "started",
				},
				message: "CLI daemon workflow action progress",
			},
		]);
	});

	it("logs command completion and error stream events", () => {
		const entries: LogEntry[] = [];
		const logger = createLogger(entries);
		const request = { action: "run" as const, projectId: "api" };

		logDaemonStreamEvent(logger, "req-4", request, {
			type: "error",
			error: "daemon rejected task",
		});
		logDaemonStreamEvent(logger, "req-4", request, {
			type: "complete",
			result: {
				status: "failed",
				request,
				commandResult: { code: 7, stdout: "", stderr: "failed" },
			},
		});

		expect(entries).toEqual([
			{
				level: "error",
				context: {
					requestId: "req-4",
					action: "run",
					projectId: "api",
					error: "daemon rejected task",
				},
				message: "CLI daemon action error",
			},
			{
				level: "info",
				context: {
					requestId: "req-4",
					action: "run",
					projectId: "api",
					status: "failed",
					exitCode: 7,
				},
				message: "CLI daemon action completed",
			},
		]);
	});

	it("logs malformed frames as warnings without changing protocol errors", () => {
		const entries: LogEntry[] = [];
		const parsed = parseCliDaemonInboundFrame(
			JSON.stringify({
				type: "command",
				requestId: "req-5",
				request: { projectId: "api" },
			}),
		);

		expect(parsed).toEqual({
			status: "error",
			error: "Malformed daemon command frame: request.action is required",
		});
		if (parsed.status !== "error") {
			throw new Error("Expected malformed daemon frame");
		}
		logMalformedDaemonFrame(createLogger(entries), parsed.error);

		expect(entries).toEqual([
			{
				level: "warn",
				context: {
					error: "Malformed daemon command frame: request.action is required",
				},
				message: "Malformed CLI daemon frame",
			},
		]);
		expect(
			serializeCliDaemonFrame({
				type: "error",
				requestId: "unknown",
				error: parsed.error,
			}),
		).toContain("Malformed daemon command frame");
	});
});

interface LogEntry {
	level: "info" | "warn" | "error";
	context: Record<string, unknown>;
	message: string;
}

function createLogger(entries: LogEntry[]): CliCommandDaemonLogger {
	return {
		info: (context, message) => {
			entries.push({ level: "info", context, message });
		},
		warn: (context, message) => {
			entries.push({ level: "warn", context, message });
		},
		error: (context, message) => {
			entries.push({ level: "error", context, message });
		},
	};
}
