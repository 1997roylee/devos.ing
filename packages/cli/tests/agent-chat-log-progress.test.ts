import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseWorkflowProgressLine } from "../src/features/server";
import { runAgentWithChatLog } from "../src/features/workflow/workflow";

describe("runAgentWithChatLog progress", () => {
	it("emits safe agent role progress without prompt content", async () => {
		const tempDir = await mkdtemp(path.join(os.tmpdir(), "devos-agent-log-"));
		const previousEnv = process.env.DEVOS_WORKFLOW_PROGRESS_STREAM;
		const previousWrite = process.stdout.write;
		const writes: string[] = [];
		process.env.DEVOS_WORKFLOW_PROGRESS_STREAM = "1";
		process.stdout.write = ((chunk: string | Uint8Array) => {
			writes.push(String(chunk));
			return true;
		}) as typeof process.stdout.write;

		try {
			await runAgentWithChatLog({
				workspacePath: tempDir,
				projectId: "default",
				issue: {
					id: "issue-1",
					key: "ENG-123",
					title: "Secret task title",
					url: "https://linear.example/ENG-123",
				},
				agentRole: "planning",
				skillPath: "/tmp/SKILL.md",
				prompt: "secret prompt body",
				invoke: async () => ({
					finalMessage: "done",
					stdout: "",
				}),
			});
		} finally {
			process.stdout.write = previousWrite;
			if (previousEnv === undefined) {
				Reflect.deleteProperty(process.env, "DEVOS_WORKFLOW_PROGRESS_STREAM");
			} else {
				process.env.DEVOS_WORKFLOW_PROGRESS_STREAM = previousEnv;
			}
			await rm(tempDir, { recursive: true, force: true });
		}

		const parsedEvents = writes
			.map((line) => parseWorkflowProgressLine(line))
			.filter((result) => result.status === "ok")
			.map((result) => result.event);

		expect(parsedEvents).toMatchObject([
			{
				kind: "action",
				action: "agent",
				agentRole: "planning",
				issueKey: "ENG-123",
				status: "started",
			},
			{
				kind: "action",
				action: "agent",
				agentRole: "planning",
				issueKey: "ENG-123",
				status: "succeeded",
			},
		]);
		expect(writes.join("")).not.toContain("secret prompt body");
		expect(writes.join("")).not.toContain("Secret task title");
	});
});
