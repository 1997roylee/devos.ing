import type { SupportedCliCommandRequest } from "../src/features/server/cli-command-executor.types";
import type { CommandResult } from "../src/utils/shell";

export interface SimulationCase {
	name: string;
	request: SupportedCliCommandRequest;
	expectedArgs: string[];
	commandResult: CommandResult;
	expectedStatus: "succeeded" | "failed";
	expectedError?: string;
}
