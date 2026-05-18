import { spawn } from "node:child_process";
import {
	formatCliDaemonWsUrl,
	resolveCliDaemonPort,
	startCliCommandDaemon,
} from "./command-daemon";
import type {
	DaemonChild,
	DaemonServiceCommand,
	DaemonSignalTarget,
	DaemonSpawn,
	RunCliCommandDaemonOnlyOptions,
	RunProductionDaemonOptions,
} from "./daemon.types";

const DEFAULT_SERVER_PORT = "3001";
const DEFAULT_WEB_PORT = "3000";
const SIGNALS = ["SIGINT", "SIGTERM"] as const;

export function buildDaemonCommands(
	env: NodeJS.ProcessEnv = process.env,
): DaemonServiceCommand[] {
	const serverPort = env.PIV_SERVER_PORT ?? DEFAULT_SERVER_PORT;
	const webPort = env.PORT ?? DEFAULT_WEB_PORT;
	const cliDaemonPort = resolveCliDaemonPort(env);
	const cliDaemonWsUrl =
		env.DEVOS_CLI_DAEMON_WS_URL ?? formatCliDaemonWsUrl(cliDaemonPort);
	const serverBaseUrl = resolveServerBaseUrl(env);
	const serverEventsWsUrl =
		env.DEVOS_SERVER_EVENTS_WS_URL ?? resolveServerEventsWsUrl(serverBaseUrl);
	const serverWsUrl =
		env.NEXT_PUBLIC_DEVOS_SERVER_WS_URL ??
		`ws://127.0.0.1:${serverPort}/api/cli/stream`;
	const baseEnv = { ...env, NODE_ENV: "production" };

	return [
		{
			name: "server",
			command: "bun",
			args: ["run", "--filter", "devos-server", "start"],
			env: {
				...baseEnv,
				PIV_SERVER_PORT: serverPort,
				DEVOS_CLI_DAEMON_WS_URL: cliDaemonWsUrl,
			},
		},
		{
			name: "web",
			command: "bun",
			args: ["run", "--filter", "web", "start"],
			env: {
				...baseEnv,
				PORT: webPort,
				DEVOS_SERVER_BASE_URL: serverBaseUrl,
				NEXT_PUBLIC_DEVOS_SERVER_WS_URL: serverWsUrl,
			},
		},
		{
			name: "workflow-poller",
			command: "npx",
			args: ["devos", "run", "--all-projects", "--poll-forever"],
			env: {
				...baseEnv,
				DEVOS_SERVER_BASE_URL: serverBaseUrl,
				DEVOS_SERVER_EVENTS_WS_URL: serverEventsWsUrl,
			},
		},
	];
}

export async function runProductionDaemon(
	options: RunProductionDaemonOptions = {},
): Promise<number> {
	const cwd = options.cwd ?? process.cwd();
	const spawnChild = options.spawnChild ?? spawnDaemonChild;
	const signalTarget = options.signalTarget ?? process;
	const env = options.env ?? process.env;
	const serverBaseUrl = resolveServerBaseUrl(env);
	const commandDaemon = (options.startCommandDaemon ?? startCliCommandDaemon)({
		cwd,
		env: {
			...env,
			DEVOS_SERVER_BASE_URL: serverBaseUrl,
			DEVOS_SERVER_EVENTS_WS_URL:
				env.DEVOS_SERVER_EVENTS_WS_URL ??
				resolveServerEventsWsUrl(serverBaseUrl),
		},
	});
	const children = buildDaemonCommands(options.env).map((service) =>
		spawnChild(service.command, service.args, {
			cwd,
			env: service.env,
			stdio: "inherit",
		}),
	);

	return superviseDaemonChildren(children, signalTarget, commandDaemon);
}

export function runCliCommandDaemonOnly(
	options: RunCliCommandDaemonOnlyOptions = {},
): Promise<number> {
	const cwd = options.cwd ?? process.cwd();
	const signalTarget = options.signalTarget ?? process;
	const commandDaemon = (options.startCommandDaemon ?? startCliCommandDaemon)({
		cwd,
		env: options.env,
	});
	const write = options.write ?? process.stdout.write.bind(process.stdout);
	write(
		`CLI daemon websocket listening on ${formatCliDaemonWsUrl(commandDaemon.port)}\n`,
	);

	return superviseCliCommandDaemon(commandDaemon, signalTarget);
}

function superviseCliCommandDaemon(
	commandDaemon: { stop(): Promise<void> },
	signalTarget: DaemonSignalTarget,
): Promise<number> {
	return new Promise((resolve) => {
		let resolved = false;

		const finish = (code: number) => {
			if (resolved) {
				return;
			}
			resolved = true;
			for (const signal of SIGNALS) {
				signalTarget.off(signal, signalHandlers[signal]);
			}
			void commandDaemon.stop().finally(() => resolve(code));
		};

		const signalHandlers = {
			SIGINT: () => finish(0),
			SIGTERM: () => finish(0),
		};

		for (const signal of SIGNALS) {
			signalTarget.on(signal, signalHandlers[signal]);
		}
	});
}

function superviseDaemonChildren(
	children: DaemonChild[],
	signalTarget: DaemonSignalTarget,
	commandDaemon: { stop(): Promise<void> },
): Promise<number> {
	return new Promise((resolve) => {
		let resolved = false;
		let isShuttingDown = false;

		const finish = (code: number) => {
			if (resolved) {
				return;
			}
			resolved = true;
			for (const signal of SIGNALS) {
				signalTarget.off(signal, signalHandlers[signal]);
			}
			void commandDaemon.stop();
			resolve(code);
		};

		const shutdown = (
			signal: NodeJS.Signals = "SIGTERM",
			excludedChild?: DaemonChild,
		) => {
			if (isShuttingDown) {
				return;
			}
			isShuttingDown = true;
			for (const child of children) {
				if (child !== excludedChild && !child.killed) {
					child.kill(signal);
				}
			}
		};

		const signalHandlers = {
			SIGINT: () => {
				shutdown("SIGINT");
				finish(0);
			},
			SIGTERM: () => {
				shutdown("SIGTERM");
				finish(0);
			},
		};

		for (const signal of SIGNALS) {
			signalTarget.on(signal, signalHandlers[signal]);
		}

		for (const child of children) {
			child.on("error", () => {
				shutdown("SIGTERM", child);
				finish(1);
			});
			child.on("close", (code, signal) => {
				if (resolved) {
					return;
				}
				shutdown(signal ?? undefined, child);
				finish(code ?? (signal ? 1 : 0));
			});
		}
	});
}

const spawnDaemonChild: DaemonSpawn = (command, args, options) =>
	spawn(command, args, options);

function resolveServerBaseUrl(env: NodeJS.ProcessEnv): string {
	const serverPort = env.PIV_SERVER_PORT ?? DEFAULT_SERVER_PORT;
	return env.DEVOS_SERVER_BASE_URL ?? `http://127.0.0.1:${serverPort}`;
}

function resolveServerEventsWsUrl(serverBaseUrl: string): string {
	const url = new URL("/daemon/events", serverBaseUrl);
	if (url.protocol === "http:") {
		url.protocol = "ws:";
	}
	if (url.protocol === "https:") {
		url.protocol = "wss:";
	}
	return url.toString();
}
