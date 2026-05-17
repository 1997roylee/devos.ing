import { logger as defaultLogger } from "../../utils/logger";
import { CliCommandExecutor } from "../server";
import type { CliCommandRequest, CliCommandStreamEvent } from "../server";
import {
	parseCliDaemonInboundFrame,
	serializeCliDaemonFrame,
} from "./command-daemon-protocol";
import type {
	CliCommandDaemon,
	CliCommandDaemonLogger,
	CliCommandDaemonOptions,
	CliDaemonOutboundFrame,
} from "./command-daemon.types";

export const DEFAULT_CLI_DAEMON_PORT = 3002;

export function resolveCliDaemonPort(env: NodeJS.ProcessEnv): number {
	const rawPort = env.DEVOS_CLI_DAEMON_PORT;
	if (!rawPort) {
		return DEFAULT_CLI_DAEMON_PORT;
	}
	const port = Number(rawPort);
	if (!Number.isInteger(port) || port <= 0) {
		throw new Error("CLI daemon port must be a positive integer");
	}
	return port;
}

export function formatCliDaemonWsUrl(port: number): string {
	return `ws://127.0.0.1:${port}`;
}

export function startCliCommandDaemon(
	options: CliCommandDaemonOptions,
): CliCommandDaemon {
	const port = options.port ?? resolveCliDaemonPort(options.env ?? process.env);
	const daemonLogger = options.logger ?? defaultLogger;
	const executor = new CliCommandExecutor({
		cwd: options.cwd,
		command: "bun",
		baseArgs: ["run", "./packages/cli/src/index.ts"],
		env: { ...options.env, DEVOS_WORKFLOW_PROGRESS_STREAM: "1" },
	});
	const server = Bun.serve<{ connectedAt: string }>({
		port,
		fetch(request, bunServer) {
			if (
				bunServer.upgrade(request, {
					data: { connectedAt: new Date().toISOString() },
				})
			) {
				return undefined;
			}
			return new Response("CLI daemon websocket endpoint", { status: 426 });
		},
		websocket: {
			open(socket) {
				sendFrame(socket, { type: "ready" });
			},
			message(socket, message) {
				const parsed = parseCliDaemonInboundFrame(String(message));
				if (parsed.status === "error") {
					logMalformedDaemonFrame(daemonLogger, parsed.error);
					sendFrame(socket, {
						type: "error",
						requestId: "unknown",
						error: parsed.error,
					});
					return;
				}
				const frame = parsed.frame;
				if (frame.type === "ping") {
					sendFrame(socket, {
						type: "pong",
						requestId: frame.requestId,
					});
					return;
				}
				logDaemonActionReceived(daemonLogger, frame.requestId, frame.request);
				void executor.executeStream(frame.request, (event) => {
					logDaemonStreamEvent(
						daemonLogger,
						frame.requestId,
						frame.request,
						event,
					);
					sendFrame(socket, toOutboundFrame(frame.requestId, event));
				});
			},
		},
	});
	return {
		port,
		stop: () => Promise.resolve(server.stop(true)),
	};
}

export function logMalformedDaemonFrame(
	daemonLogger: CliCommandDaemonLogger,
	error: string,
): void {
	daemonLogger.warn({ error }, "Malformed CLI daemon frame");
}

export function logDaemonActionReceived(
	daemonLogger: CliCommandDaemonLogger,
	requestId: string,
	request: CliCommandRequest,
): void {
	daemonLogger.info(
		buildDaemonActionLogContext(requestId, request),
		"CLI daemon action received",
	);
}

export function buildDaemonActionLogContext(
	requestId: string,
	request: CliCommandRequest,
): Record<string, unknown> {
	const fields = request as Record<string, unknown>;
	return pickDefined({
		requestId,
		action: request.action,
		projectId: stringField(fields.projectId),
		issueKey: stringField(fields.issueKey),
		allProjects: booleanField(fields.allProjects),
		poll: booleanField(fields.poll),
		pollForever: booleanField(fields.pollForever),
		skillsAction: stringField(fields.skillsAction),
		taskAction: stringField(fields.taskAction),
	});
}

export function logDaemonStreamEvent(
	daemonLogger: CliCommandDaemonLogger,
	requestId: string,
	request: CliCommandRequest,
	event: CliCommandStreamEvent,
): void {
	if (event.type === "progress" && event.event.kind === "action") {
		daemonLogger.info(
			pickDefined({
				requestId,
				requestAction: request.action,
				projectId: event.event.projectId,
				issueKey: event.event.issueKey,
				stage: event.event.stage,
				action: event.event.action,
				status: event.event.status,
			}),
			"CLI daemon workflow action progress",
		);
		return;
	}
	if (event.type === "error") {
		daemonLogger.error(
			{
				...buildDaemonActionLogContext(requestId, request),
				error: event.error,
			},
			"CLI daemon action error",
		);
		return;
	}
	if (event.type === "complete") {
		daemonLogger.info(
			pickDefined({
				...buildDaemonActionLogContext(requestId, request),
				status: event.result.status,
				exitCode: event.result.commandResult?.code,
			}),
			"CLI daemon action completed",
		);
	}
}

function pickDefined(
	input: Record<string, unknown | undefined>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined),
	);
}

function stringField(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function booleanField(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function sendFrame(
	socket: Bun.ServerWebSocket<{ connectedAt: string }>,
	frame: CliDaemonOutboundFrame,
): void {
	try {
		socket.send(serializeCliDaemonFrame(frame));
	} catch {
		// Browser disconnects stop live streaming only; the command keeps running.
	}
}

function toOutboundFrame(
	requestId: string,
	event: CliCommandStreamEvent,
): CliDaemonOutboundFrame {
	if (event.type === "start") {
		return { ...event, requestId };
	}
	if (event.type === "stdout" || event.type === "stderr") {
		return { ...event, requestId };
	}
	if (event.type === "error") {
		return { ...event, requestId };
	}
	return { ...event, requestId };
}
