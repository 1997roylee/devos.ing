import type {
	CliCommandExecutionHistoryEntry,
	CliCommandExecutionResult,
	CliCommandRequest,
} from "adhdai/features/server";
import type { ServerDatabase } from "./db";

export interface CliExecutor {
	execute(request: CliCommandRequest): Promise<CliCommandExecutionResult>;
	getHistory(): CliCommandExecutionHistoryEntry[];
}

export interface AppDeps {
	cliExecutor: CliExecutor;
	repository: {
		database: ServerDatabase | null;
	};
}

export type RouteHandler = (request: Request) => Response | Promise<Response>;
