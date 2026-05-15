import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import type { Express } from "express";
import { listenExpressApp, sendWebResponse } from "../src/express-server";

describe("listenExpressApp", () => {
	it("uses the requested fixed port when non-zero", async () => {
		const calls: number[] = [];
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			queueMicrotask(() => server.emit("listening"));
		});

		await listenExpressApp(app, 3300);
		expect(calls).toEqual([3300]);
	});

	it("rejects bind errors without retrying", async () => {
		const calls: number[] = [];
		const error = Object.assign(new Error("in use"), {
			code: "EADDRINUSE",
		});
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			queueMicrotask(() => server.emit("error", error));
		});

		await expect(listenExpressApp(app, 0)).rejects.toBe(error);
		expect(calls).toEqual([0]);
	});

	it("forwards streamed web response chunks before the body closes", async () => {
		const encoder = new TextEncoder();
		let sendSecondChunk: (() => void) | undefined;
		const writes: string[] = [];
		const response = {
			statusCode: 0,
			headers: {} as Record<string, string>,
			status(code: number) {
				this.statusCode = code;
				return this;
			},
			setHeader(key: string, value: string) {
				this.headers[key] = value;
			},
			write(chunk: Buffer) {
				writes.push(chunk.toString());
				return true;
			},
			end() {
				writes.push("[end]");
			},
		};
		const webResponse = new Response(
			new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(encoder.encode("first"));
					sendSecondChunk = () => {
						controller.enqueue(encoder.encode("second"));
						controller.close();
					};
				},
			}),
			{ headers: { "content-type": "text/plain" } },
		);

		const sendPromise = sendWebResponse(response as never, webResponse);
		await Promise.resolve();
		expect(writes).toEqual(["first"]);

		sendSecondChunk?.();
		await sendPromise;
		expect(writes).toEqual(["first", "second", "[end]"]);
	});
});

function createFakeExpress(
	listenImpl: (port: number, server: EventEmitter) => void,
): Express {
	return {
		listen(port: number) {
			const server = new EventEmitter() as unknown as Server;
			listenImpl(port, server as unknown as EventEmitter);
			return server;
		},
	} as unknown as Express;
}
