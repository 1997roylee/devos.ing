import { runPrepCommandWithRetry } from "../../utils/prep-command-retry";
import { runCommand } from "../../utils/shell";
import type { GithubCommandDeps } from "./github.types";

const INSTALL_ARGS = ["install", "--frozen-lockfile"] as const;

export async function prepareWorktreeDependencies(
	worktreePath: string,
	deps: GithubCommandDeps = {},
): Promise<void> {
	const commandRunner = deps.runCommand ?? runCommand;
	try {
		await runPrepCommandWithRetry(
			"bun install isolated worktree dependencies",
			"bun",
			[...INSTALL_ARGS],
			{
				cwd: worktreePath,
			},
			commandRunner,
		);
		return;
	} catch (error) {
		const output = error instanceof Error ? error.message : String(error);
		throw new Error(
			[
				`Failed to prepare isolated worktree dependencies at '${worktreePath}'.`,
				`Command: bun ${INSTALL_ARGS.join(" ")}`,
				"Output:",
				output.trim() || "No output",
				"Ensure this environment has network access or a populated Bun dependency cache / node_modules matching bun.lock.",
			].join("\n"),
		);
	}
}
