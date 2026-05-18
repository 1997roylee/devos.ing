#!/usr/bin/env bun
import { parseArgs } from "./args";
import {
	handleCommand,
	handleOnboardCommand,
	printHelp,
} from "./commands/handlers";
import { loadConfig } from "./features/config";
import {
	runCliCommandDaemonOnly,
	runProductionDaemon,
} from "./features/daemon";
import {
	logger,
	normalizeError,
	setupProcessErrorHandlers,
} from "./utils/logger";

async function main(): Promise<void> {
	setupProcessErrorHandlers();
	const command = parseArgs(process.argv);
	if (command.kind === "help") {
		printHelp();
		return;
	}

	const cwd = process.cwd();
	if (command.kind === "onboard") {
		await handleOnboardCommand(command, cwd);
		return;
	}
	if (command.kind === "daemon") {
		if (command.cliOnly) {
			process.exitCode = await runCliCommandDaemonOnly({
				cwd,
				pollForever: command.pollForever,
				allProjects: command.allProjects,
			});
			return;
		}
		process.exitCode = await runProductionDaemon({ cwd });
		return;
	}

	const config = await loadConfig(cwd);
	await handleCommand(command, config);
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	logger.error({ err: normalizeError(error) }, message);
	process.exitCode = 1;
});
