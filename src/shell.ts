import { spawn } from "node:child_process";

export interface CommandResult {
	code: number;
	stdout: string;
	stderr: string;
}

export async function runCommand(
	command: string,
	args: string[],
	options: {
		cwd: string;
		env?: Record<string, string | undefined>;
	},
): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: { ...process.env, ...options.env },
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			resolve({
				code: code ?? 1,
				stdout,
				stderr,
			});
		});
	});
}

export function assertCommandOk(
	command: string,
	args: string[],
	result: CommandResult,
): void {
	if (result.code !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed with ${result.code}\n${result.stderr || result.stdout}`,
		);
	}
}
