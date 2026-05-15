import {
	readFlagValue,
	readOptionalPositiveInt,
	readRequiredFlagValue,
} from "../../args-utils";
import type { AgentsCommand } from "../../args.types";

export function parseAgentsCommand(args: string[]): AgentsCommand {
	const action = args[0];
	if (!action) {
		throw new Error(
			"agents command requires an action: list | show | add | update | remove",
		);
	}
	if (action === "list") {
		return {
			action,
			projectId: readFlagValue(args.slice(1), "--project"),
			json: args.includes("--json"),
		};
	}
	if (action === "show") {
		return {
			action,
			id: readRequiredArg(args[1], "agents show requires <ID>"),
			projectId: readFlagValue(args.slice(2), "--project"),
			json: args.includes("--json"),
		};
	}
	if (action === "add") {
		const actionArgs = args.slice(1);
		return {
			action,
			projectId: readFlagValue(actionArgs, "--project"),
			input: {
				id: readRequiredFlagValue(actionArgs, "--id", "agents add"),
				title: readRequiredFlagValue(actionArgs, "--title", "agents add"),
				description: readRequiredFlagValue(
					actionArgs,
					"--description",
					"agents add",
				),
				logo: readRequiredFlagValue(actionArgs, "--logo", "agents add"),
				runtime: readRequiredFlagValue(actionArgs, "--runtime", "agents add"),
				model: readRequiredFlagValue(actionArgs, "--model", "agents add"),
				concurrency: readRequiredPositiveInt(
					actionArgs,
					"--concurrency",
					"agents add",
				),
				owner: readRequiredFlagValue(actionArgs, "--owner", "agents add"),
				createdAt: readFlagValue(actionArgs, "--created-at"),
				updatedAt: readFlagValue(actionArgs, "--updated-at"),
				skills: readListFlag(actionArgs, "--skills"),
				recentWork: readListFlag(actionArgs, "--recent-work"),
				activity: readListFlag(actionArgs, "--activity"),
				instructions: readRequiredFlagValue(
					actionArgs,
					"--instructions",
					"agents add",
				),
			},
		};
	}
	if (action === "update") {
		const actionArgs = args.slice(2);
		const input = {
			title: readFlagValue(actionArgs, "--title"),
			description: readFlagValue(actionArgs, "--description"),
			logo: readFlagValue(actionArgs, "--logo"),
			runtime: readFlagValue(actionArgs, "--runtime"),
			model: readFlagValue(actionArgs, "--model"),
			concurrency: readOptionalPositiveInt(actionArgs, "--concurrency"),
			owner: readFlagValue(actionArgs, "--owner"),
			createdAt: readFlagValue(actionArgs, "--created-at"),
			updatedAt: readFlagValue(actionArgs, "--updated-at"),
			skills: readOptionalListFlag(actionArgs, "--skills"),
			recentWork: readOptionalListFlag(actionArgs, "--recent-work"),
			activity: readOptionalListFlag(actionArgs, "--activity"),
			instructions: readFlagValue(actionArgs, "--instructions"),
		};
		if (Object.values(input).every((value) => value === undefined)) {
			throw new Error("agents update requires at least one profile field");
		}
		return {
			action,
			id: readRequiredArg(args[1], "agents update requires <ID>"),
			projectId: readFlagValue(actionArgs, "--project"),
			input,
		};
	}
	if (action === "remove") {
		return {
			action,
			id: readRequiredArg(args[1], "agents remove requires <ID>"),
			projectId: readFlagValue(args.slice(2), "--project"),
		};
	}
	throw new Error(`Unknown agents action: ${action}`);
}

function readRequiredArg(value: string | undefined, message: string): string {
	if (!value) {
		throw new Error(message);
	}
	return value;
}

function readRequiredPositiveInt(
	args: string[],
	flag: string,
	context: string,
): number {
	const value = readOptionalPositiveInt(args, flag);
	if (value === undefined) {
		throw new Error(`${context} requires ${flag} <N>`);
	}
	return value;
}

function readListFlag(args: string[], flag: string): string[] {
	return readOptionalListFlag(args, flag) ?? [];
}

function readOptionalListFlag(
	args: string[],
	flag: string,
): string[] | undefined {
	const raw = readFlagValue(args, flag);
	if (raw === undefined) {
		return undefined;
	}
	return raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}
