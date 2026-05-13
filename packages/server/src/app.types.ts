import type {
	CliCommandExecutionHistoryEntry,
	CliCommandExecutionResult,
	CliCommandRequest,
} from "adhdai/features/server";
import type { NotificationService } from "./notifications/notifications-service";

export interface CliExecutor {
	execute(request: CliCommandRequest): Promise<CliCommandExecutionResult>;
	getHistory(): CliCommandExecutionHistoryEntry[];
}

export interface AppDeps {
	cliExecutor: CliExecutor;
	notificationService: NotificationService;
}

export type RouteHandler = (request: Request) => Response | Promise<Response>;
