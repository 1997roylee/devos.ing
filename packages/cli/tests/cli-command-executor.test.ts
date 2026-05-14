import { describe, expect, it } from "bun:test";
import { CliCommandExecutor } from "../src/features/server/cli-command-executor";
import type {
	CliCommandExecutionResult,
	RunCommandFn,
} from "../src/features/server/cli-command-executor.types";
import { CLI_COMMAND_SIMULATION_MATRIX } from "./cli-command-executor-simulation-matrix";

const DEFAULT_OPTIONS = {
	cwd: "/tmp/work",
	command: "bun",
	baseArgs: ["run", "./packages/cli/src/index.ts"] as string[],
};

describe("CliCommandExecutor", () => {
	it("simulates every supported command variant with structured argv and history capture", async () => {
		for (const simulation of CLI_COMMAND_SIMULATION_MATRIX) {
			const calls: Array<{
				command: string;
				args: string[];
				options: {
					cwd: string;
					env?: NodeJS.ProcessEnv;
					stdinMode?: "pipe" | "ignore" | "inherit";
					streamStdout?: boolean;
					streamStderr?: boolean;
				};
			}> = [];
			const runCommandFn: RunCommandFn = async (command, args, options) => {
				calls.push({ command, args, options });
				return simulation.commandResult;
			};
			const executor = new CliCommandExecutor({
				...DEFAULT_OPTIONS,
				runCommandFn,
			});

			const result = await executor.execute(simulation.request);

			expect(result.status, simulation.name).toBe(simulation.expectedStatus);
			expect(calls, simulation.name).toEqual([
				{
					command: "bun",
					args: simulation.expectedArgs,
					options: {
						cwd: "/tmp/work",
						streamStdout: true,
						streamStderr: true,
					},
				},
			]);
			assertHistory(executor.getHistory()[0], result, simulation.expectedError);
		}
	});

	it("records spawn errors as failed results with invocation metadata", async () => {
		const runCommandFn: RunCommandFn = async () => {
			throw new Error("spawn EACCES");
		};
		const executor = new CliCommandExecutor({
			...DEFAULT_OPTIONS,
			runCommandFn,
		});

		const result = await executor.execute({ action: "projects" });
		const history = executor.getHistory();

		expect(result.status).toBe("failed");
		expect(result.error).toBe("spawn EACCES");
		expect(history).toHaveLength(1);
		expect(history[0]?.status).toBe("failed");
		expect(history[0]?.error).toBe("spawn EACCES");
		expect(history[0]?.args).toEqual([
			"run",
			"./packages/cli/src/index.ts",
			"projects",
		]);
	});

	it("rejects unsupported and malformed requests without execution", async () => {
		let callCount = 0;
		const runCommandFn: RunCommandFn = async () => {
			callCount += 1;
			return { code: 0, stdout: "", stderr: "" };
		};
		const executor = new CliCommandExecutor({
			...DEFAULT_OPTIONS,
			runCommandFn,
		});

		const unsupportedAction = await executor.execute({
			action: "dangerous-shell",
		});
		const unknownAction = await executor.execute({
			action: "unknown-action",
		} as unknown as { action: string });
		const stopAction = await executor.execute({
			action: "stop",
		} as unknown as { action: string });
		const malformedSetup = await executor.execute({
			action: "setup",
			check: "false",
		} as unknown as { action: string });
		const malformedStatus = await executor.execute({
			action: "status",
			issueKey: "ROY-122",
		} as unknown as { action: string });
		const malformedSkillsAction = await executor.execute({
			action: "skills",
		} as unknown as { action: string });
		const malformedTaskCreate = await executor.execute({
			action: "task",
			taskAction: "create",
			request: "   ",
		} as unknown as { action: string });
		const malformedTaskUnsafeField = await executor.execute({
			action: "task",
			taskAction: "create",
			request: "Build flow",
			stdinMode: "pipe",
		} as unknown as { action: string });
		const malformedRunField = await executor.execute({
			action: "run",
			concurrency: 0,
		} as unknown as { action: string });

		expect(unsupportedAction.status).toBe("rejected");
		expect(unsupportedAction.error).toContain("Unsupported CLI action");
		expect(unknownAction.status).toBe("rejected");
		expect(stopAction.status).toBe("rejected");
		expect(stopAction.error).toContain("typed stop workflow boundary");
		expect(malformedSetup.status).toBe("rejected");
		expect(malformedStatus.status).toBe("rejected");
		expect(malformedSkillsAction.status).toBe("rejected");
		expect(malformedTaskCreate.status).toBe("rejected");
		expect(malformedTaskUnsafeField.status).toBe("rejected");
		expect(malformedRunField.status).toBe("rejected");
		expect(callCount).toBe(0);
	});
});

function assertHistory(
	history: ReturnType<CliCommandExecutor["getHistory"]>[number] | undefined,
	result: CliCommandExecutionResult,
	expectedError?: string,
): void {
	expect(history).toBeDefined();
	expect(history?.status).toBe(result.status);
	expect(history?.exitCode).toBe(result.commandResult?.code);
	expect(history?.stdout).toBe(result.commandResult?.stdout);
	expect(history?.stderr).toBe(result.commandResult?.stderr);
	expect(history?.requestedAt).toBeString();
	expect(history?.finishedAt).toBeString();
	if (expectedError) {
		expect(history?.error).toBe(expectedError);
	}
}
