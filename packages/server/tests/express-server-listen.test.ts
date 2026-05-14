import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import type { Express } from "express";
import { listenExpressApp } from "../src/express-server";

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
