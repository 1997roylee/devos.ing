import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { parseCliDaemonInboundFrame } from "devos/features/daemon";
import { WebSocket, WebSocketServer } from "ws";
import type {
	CliStreamDaemonSocketConstructor,
	CliStreamProxy,
	CliStreamProxyOptions,
	CliStreamSocket,
} from "./cli-stream-proxy.types";

export function attachCliStreamProxy(
	options: CliStreamProxyOptions,
): CliStreamProxy {
	const webSocketServer = new WebSocketServer({ noServer: true });
	const onUpgrade = (
		request: IncomingMessage,
		socket: Duplex,
		head: Buffer,
	): void => {
		const url = new URL(request.url ?? "/", "http://localhost");
		if (url.pathname !== options.path) {
			return;
		}
		webSocketServer.handleUpgrade(request, socket, head, (client) => {
			webSocketServer.emit("connection", client, request);
		});
	};

	webSocketServer.on("connection", (client) => {
		proxyClientToDaemon(client, options.daemonUrl);
	});
	options.server.on("upgrade", onUpgrade);

	return {
		close: () =>
			new Promise((resolve, reject) => {
				options.server.off("upgrade", onUpgrade);
				webSocketServer.close((error) => (error ? reject(error) : resolve()));
			}),
	};
}

export function proxyClientToDaemon(
	client: CliStreamSocket,
	daemonUrl: string,
	DaemonWebSocket: CliStreamDaemonSocketConstructor = WebSocket,
): void {
	const daemon = new DaemonWebSocket(daemonUrl);
	const queuedMessages: WebSocket.RawData[] = [];

	daemon.on("open", () => {
		for (const message of queuedMessages.splice(0)) {
			daemon.send(message);
		}
	});
	daemon.on("message", (message) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
	daemon.on("error", () => {
		sendProxyError(client, "CLI daemon websocket connection failed");
	});
	daemon.on("close", () => {
		if (client.readyState === WebSocket.OPEN) {
			client.close();
		}
	});
	client.on("message", (message: WebSocket.RawData) => {
		forwardClientMessage(client, daemon, queuedMessages, message);
	});
	client.on("close", () => {
		if (
			daemon.readyState === WebSocket.OPEN ||
			daemon.readyState === WebSocket.CONNECTING
		) {
			daemon.close();
		}
	});
}

function forwardClientMessage(
	client: CliStreamSocket,
	daemon: CliStreamSocket,
	queuedMessages: WebSocket.RawData[],
	message: WebSocket.RawData,
): void {
	const parsed = parseCliDaemonInboundFrame(String(message));
	if (parsed.status === "error") {
		sendProxyError(client, parsed.error);
		return;
	}
	if (daemon.readyState === WebSocket.OPEN) {
		daemon.send(message);
		return;
	}
	queuedMessages.push(message);
}

function sendProxyError(client: CliStreamSocket, error: string): void {
	if (client.readyState !== WebSocket.OPEN) {
		return;
	}
	client.send(JSON.stringify({ type: "error", requestId: "unknown", error }));
}
