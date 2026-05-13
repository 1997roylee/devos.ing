import type {
	CliCommandExecutionHistoryEntry,
	CliCommandExecutionResult,
	CliCommandRequest,
} from "adhdai/features/server";
import type { BoardRepository } from "./board";

export interface CliExecutor {
	execute(request: CliCommandRequest): Promise<CliCommandExecutionResult>;
	getHistory(): CliCommandExecutionHistoryEntry[];
}

export interface AppDeps {
	cliExecutor: CliExecutor;
	boardRepository: BoardRepository;
}

export type RouteHandler = (request: Request) => Response | Promise<Response>;
