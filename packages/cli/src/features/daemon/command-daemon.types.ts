import type {
	CliCommandExecutionResult,
	CliCommandInvocation,
	CliCommandRequest,
	WorkflowProgressEvent,
} from "../server";

export type CliDaemonInboundFrame =
	| {
			type: "command";
			requestId: string;
			request: CliCommandRequest;
	  }
	| {
			type: "ping";
			requestId: string;
	  };

export type CliDaemonOutboundFrame =
	| {
			type: "ready";
			requestId?: string;
	  }
	| {
			type: "pong";
			requestId: string;
	  }
	| {
			type: "start";
			requestId: string;
			request: CliCommandRequest;
			invocation: CliCommandInvocation;
	  }
	| {
			type: "stdout" | "stderr";
			requestId: string;
			text: string;
	  }
	| {
			type: "progress";
			requestId: string;
			event: WorkflowProgressEvent;
	  }
	| {
			type: "error";
			requestId: string;
			error: string;
	  }
	| {
			type: "complete";
			requestId: string;
			result: CliCommandExecutionResult;
	  };

export interface CliCommandDaemon {
	port: number;
	stop(): Promise<void>;
}

export interface CliCommandDaemonOptions {
	cwd: string;
	env?: NodeJS.ProcessEnv;
	port?: number;
	logger?: CliCommandDaemonLogger;
}

export interface CliCommandDaemonLogger {
	info(context: Record<string, unknown>, message: string): void;
	warn(context: Record<string, unknown>, message: string): void;
	error(context: Record<string, unknown>, message: string): void;
}
