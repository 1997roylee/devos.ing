import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import { WebSocket } from "ws";
import { proxyClientToDaemon } from "../src/ws/cli-stream-proxy";
import type { CliStreamSocket } from "../src/ws/cli-stream-proxy.types";

describe("CLI stream proxy", () => {
	it("forwards browser command frames to the daemon websocket", () => {
		const client = new FakeSocket(WebSocket.OPEN);
		const DaemonWebSocket = createFakeDaemonConstructor();
		proxyClientToDaemon(client, "ws://daemon.test", DaemonWebSocket);
		const daemon = DaemonWebSocket.instances[0];

		client.emitMessage(
			JSON.stringify({
				type: "command",
				requestId: "req-1",
				request: { action: "projects" },
			}),
		);
		expect(daemon?.sent).toEqual([]);

		daemon?.open();
		expect(daemon?.sent).toEqual([
			JSON.stringify({
				type: "command",
				requestId: "req-1",
				request: { action: "projects" },
			}),
		]);

		daemon?.emitMessage(
			JSON.stringify({ type: "stdout", requestId: "req-1", text: "hello\n" }),
		);
		daemon?.emitMessage(
			JSON.stringify({
				type: "complete",
				requestId: "req-1",
				result: { status: "succeeded", request: { action: "projects" } },
			}),
		);

		expect(client.sent.map((message) => JSON.parse(String(message)))).toEqual([
			{ type: "stdout", requestId: "req-1", text: "hello\n" },
			{
				type: "complete",
				requestId: "req-1",
				result: { status: "succeeded", request: { action: "projects" } },
			},
		]);
	});

	it("reports daemon connection failures to the browser websocket", () => {
		const client = new FakeSocket(WebSocket.OPEN);
		const DaemonWebSocket = createFakeDaemonConstructor();
		proxyClientToDaemon(client, "ws://daemon.test", DaemonWebSocket);

		DaemonWebSocket.instances[0]?.fail();

		expect(client.sent.map((message) => JSON.parse(String(message)))).toEqual([
			{
				type: "error",
				requestId: "unknown",
				error: "CLI daemon websocket connection failed",
			},
		]);
	});

	it("rejects malformed browser frames before forwarding to the daemon", () => {
		const client = new FakeSocket(WebSocket.OPEN);
		const DaemonWebSocket = createFakeDaemonConstructor();
		proxyClientToDaemon(client, "ws://daemon.test", DaemonWebSocket);
		const daemon = DaemonWebSocket.instances[0];

		client.emitMessage(JSON.stringify({ action: "projects" }));
		daemon?.open();

		expect(daemon?.sent).toEqual([]);
		expect(client.sent.map((message) => JSON.parse(String(message)))).toEqual([
			{
				type: "error",
				requestId: "unknown",
				error: "Malformed daemon frame: type is required",
			},
		]);
	});
});

class FakeSocket extends EventEmitter implements CliStreamSocket {
	readonly sent: Array<Parameters<CliStreamSocket["send"]>[0]> = [];

	constructor(public readyState: number = WebSocket.CONNECTING) {
		super();
	}

	send(message: Parameters<CliStreamSocket["send"]>[0]): void {
		this.sent.push(message);
	}

	close(): void {
		this.readyState = WebSocket.CLOSED;
		this.emit("close");
	}

	open(): void {
		this.readyState = WebSocket.OPEN;
		this.emit("open");
	}

	fail(): void {
		this.emit("error", new Error("connect failed"));
	}

	emitMessage(message: string): void {
		this.emit("message", message);
	}
}

function createFakeDaemonConstructor(): (new (
	url: string,
) => CliStreamSocket) & {
	readonly instances: FakeSocket[];
} {
	class FakeDaemonSocket extends FakeSocket {
		static readonly instances: FakeDaemonSocket[] = [];

		constructor(readonly url: string) {
			super();
			FakeDaemonSocket.instances.push(this);
		}
	}
	return FakeDaemonSocket;
}
