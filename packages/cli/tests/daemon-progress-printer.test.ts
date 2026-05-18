import { describe, expect, it } from "bun:test";
import {
	createDaemonProgressPrinter,
	formatWorkflowProgressForDaemon,
} from "../src/features/daemon";
import {
	buildWorkflowProgressEvent,
	serializeWorkflowProgressEvent,
} from "../src/features/server";

describe("daemon progress printer", () => {
	it("formats polling, issue, agent, and workflow events as human lines", () => {
		expect(
			formatWorkflowProgressForDaemon(
				buildWorkflowProgressEvent({
					kind: "action",
					projectId: "default",
					stage: "polling",
					action: "cycle_started",
					status: "started",
					detail: "cycle 4 started",
				}),
			),
		).toBe("polling: project default cycle 4 started");

		expect(
			formatWorkflowProgressForDaemon(
				buildWorkflowProgressEvent({
					kind: "action",
					projectId: "default",
					issueKey: "ENG-123",
					stage: "planning",
					action: "issue",
					status: "started",
				}),
			),
		).toBe("workflow: ENG-123 taken at stage planning");

		expect(
			formatWorkflowProgressForDaemon(
				buildWorkflowProgressEvent({
					kind: "action",
					projectId: "default",
					issueKey: "ENG-123",
					stage: "planning",
					action: "agent",
					agentRole: "planning",
					status: "succeeded",
				}),
			),
		).toBe("agent: ENG-123 planning completed");

		expect(
			formatWorkflowProgressForDaemon(
				buildWorkflowProgressEvent({
					kind: "action",
					projectId: "default",
					issueKey: "ENG-456",
					stage: "implementing",
					action: "workflow",
					status: "failed",
					error: "boom",
				}),
			),
		).toBe("workflow: ENG-456 failed at stage implementing: boom");
	});

	it("prints sentinel progress and preserves normal output", () => {
		const output: string[] = [];
		const printer = createDaemonProgressPrinter((message) =>
			output.push(message),
		);
		const event = buildWorkflowProgressEvent({
			kind: "action",
			projectId: "default",
			stage: "polling",
			action: "cycle_fetched",
			status: "succeeded",
			detail: "fetched 2 issue(s)",
		});

		printer.push("normal log line\n");
		printer.push(serializeWorkflowProgressEvent(event));
		printer.flush();

		expect(output).toEqual([
			"normal log line\n",
			"polling: project default fetched 2 issue(s)\n",
		]);
	});

	it("does not print sensitive unused fields from malformed payload-shaped events", () => {
		const output: string[] = [];
		const printer = createDaemonProgressPrinter((message) =>
			output.push(message),
		);
		printer.push(
			`${serializeWorkflowProgressEvent(
				buildWorkflowProgressEvent({
					kind: "action",
					projectId: "default",
					issueKey: "ENG-123",
					stage: "planning",
					action: "agent",
					agentRole: "planning",
					status: "started",
				}),
			)
				.trimEnd()
				.replace(
					"}",
					',"prompt":"secret task request","skillContent":"secret skill"}',
				)}\n`,
		);

		expect(output.join("")).toContain("agent: ENG-123 planning started");
		expect(output.join("")).not.toContain("secret task request");
		expect(output.join("")).not.toContain("secret skill");
	});

	it("prints malformed progress warnings without throwing", () => {
		const output: string[] = [];
		const printer = createDaemonProgressPrinter((message) =>
			output.push(message),
		);

		printer.push("__DEVOS_WORKFLOW_PROGRESS__{nope\n");

		expect(output.join("")).toContain("progress: malformed workflow event");
	});
});
