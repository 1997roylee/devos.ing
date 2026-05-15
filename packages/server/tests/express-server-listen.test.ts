import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import type { Express } from "express";
import {
	createExpressRequestLogger,
	listenExpressApp,
	sendWebResponse,
} from "../src/express-server";
import type { ServerLogContext, ServerLogger } from "../src/logger.types";

interface LogEntry {
	level: "info" | "error" | "fatal";
	context: ServerLogContext;
	message: string;
}

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

	it("logs successful chat-create requests before query strings", () => {
		const entries: LogEntry[] = [];
		const { response, nextCalls } = runExpressRequestLogger(entries, {
			method: "POST",
			path: "/api/tasks/chat-create",
			originalUrl: "/api/tasks/chat-create?token=secret",
			statusCode: 201,
		});

		expect(nextCalls).toBe(1);
		response.emit("finish");
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			level: "info",
			context: {
				method: "POST",
				path: "/api/tasks/chat-create",
				statusCode: 201,
			},
			message: "HTTP request completed",
		});
		expect(entries[0]?.context.durationMs).toEqual(expect.any(Number));
	});

	it("logs pre-route validation failures at info level", () => {
		const entries: LogEntry[] = [];
		const { response, nextCalls } = runExpressRequestLogger(entries, {
			method: "POST",
			path: "/api/tasks/chat-create",
			statusCode: 400,
		});

		expect(nextCalls).toBe(1);
		response.emit("finish");
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			level: "info",
			context: {
				method: "POST",
				path: "/api/tasks/chat-create",
				statusCode: 400,
			},
			message: "HTTP request completed",
		});
	});

	it("logs server error responses at error level", () => {
		const entries: LogEntry[] = [];
		const { response } = runExpressRequestLogger(entries, {
			method: "POST",
			path: "/api/tasks/chat-create",
			statusCode: 503,
		});

		response.emit("finish");
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			level: "error",
			context: {
				method: "POST",
				path: "/api/tasks/chat-create",
				statusCode: 503,
			},
			message: "HTTP request completed",
		});
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

function runExpressRequestLogger(
	entries: LogEntry[],
	input: {
		method: string;
		path: string;
		originalUrl?: string;
		statusCode: number;
	},
): { response: EventEmitter; nextCalls: number } {
	const logger = createExpressRequestLogger(createLogger(entries));
	const response = new EventEmitter() as EventEmitter & { statusCode: number };
	response.statusCode = input.statusCode;
	let nextCalls = 0;
	logger(
		{
			method: input.method,
			path: input.path,
			originalUrl: input.originalUrl ?? input.path,
		} as never,
		response as never,
		() => {
			nextCalls += 1;
		},
	);
	return { response, nextCalls };
}

function createLogger(entries: LogEntry[]): ServerLogger {
	return {
		info: (context, message) => {
			entries.push({ level: "info", context, message });
		},
		error: (context, message) => {
			entries.push({ level: "error", context, message });
		},
		fatal: (context, message) => {
			entries.push({ level: "fatal", context, message });
		},
	};
}
