import type { RunOptions } from "./types";

export type CliCommand =
	| { kind: "run"; options: RunOptions }
	| { kind: "status"; issueKey: string; projectId: string }
	| { kind: "projects" }
	| { kind: "help" };

export function parseArgs(argv: string[]): CliCommand {
	const [, , ...rest] = argv;
	const command = rest[0];

	if (
		!command ||
		command === "help" ||
		command === "--help" ||
		command === "-h"
	) {
		return { kind: "help" };
	}

	if (command === "run") {
		const args = rest.slice(1);
		const issueArg = readFlagValue(args, "--issue");
		const projectId = readFlagValue(args, "--project");
		const allProjects = args.includes("--all-projects");
		if (projectId && allProjects) {
			throw new Error("run command cannot use --project with --all-projects");
		}
		return { kind: "run", options: { issueArg, projectId, allProjects } };
	}

	if (command === "status") {
		const issueKey = readFlagValue(rest.slice(1), "--issue");
		const projectId = readFlagValue(rest.slice(1), "--project");
		if (!issueKey) {
			throw new Error("status command requires --issue <LINEAR_KEY>");
		}
		if (!projectId) {
			throw new Error("status command requires --project <PROJECT_ID>");
		}
		return { kind: "status", issueKey, projectId };
	}

	if (command === "projects") {
		return { kind: "projects" };
	}

	throw new Error(`Unknown command: ${command}`);
}

function readFlagValue(args: string[], flag: string): string | undefined {
	const index = args.indexOf(flag);
	if (index < 0) {
		return undefined;
	}
	return args[index + 1];
}
