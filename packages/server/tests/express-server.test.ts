import { describe, expect, it } from "bun:test";
import type { Server } from "node:http";
import { createExpressApp, listenExpressApp } from "../src/express-server";

describe("express server adapter", () => {
	it("serves the raw OpenAPI document", async () => {
		const app = createExpressApp(async () => Response.json({ ok: true }));
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/openapi.yaml`);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain(
				"application/yaml",
			);
			expect(await response.text()).toContain("openapi: 3.0.3");
		} finally {
			await closeServer(server);
		}
	});

	it("serves Swagger UI for the OpenAPI document", async () => {
		const app = createExpressApp(async () => Response.json({ ok: true }));
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/api-docs/`);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const html = await response.text();
			expect(html).toContain("Swagger UI");
			const scriptResponse = await fetch(
				`${serverUrl(server)}/api-docs/swagger-ui-init.js`,
			);
			expect(scriptResponse.status).toBe(200);
			expect(await scriptResponse.text()).toContain("/openapi.yaml");
		} finally {
			await closeServer(server);
		}
	});

	it("serves Web Response values through Express", async () => {
		const app = createExpressApp(async (request) => {
			const url = new URL(request.url);
			return Response.json({
				method: request.method,
				pathname: url.pathname,
			});
		});
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/api/jobs`);
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				method: "GET",
				pathname: "/api/jobs",
			});
		} finally {
			await closeServer(server);
		}
	});

	it("passes request bodies to the Web handler", async () => {
		const app = createExpressApp(async (request) => {
			return Response.json(await request.json(), { status: 202 });
		});
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/api/cli/dispatch`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "projects" }),
			});
			expect(response.status).toBe(202);
			expect(await response.json()).toEqual({ action: "projects" });
		} finally {
			await closeServer(server);
		}
	});

	it("rejects malformed JSON before the Web handler", async () => {
		let handled = false;
		const app = createExpressApp(async () => {
			handled = true;
			return Response.json({ ok: true });
		});
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/api/cli/dispatch`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{bad-json}",
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({ error: "Malformed JSON body" });
			expect(handled).toBeFalse();
		} finally {
			await closeServer(server);
		}
	});

	it("rejects invalid OpenAPI body shapes", async () => {
		let handled = false;
		const app = createExpressApp(async () => {
			handled = true;
			return Response.json({ ok: true });
		});
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/api/cli/dispatch`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ nope: true }),
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toHaveProperty("error");
			expect(handled).toBeFalse();
		} finally {
			await closeServer(server);
		}
	});

	it("rejects undocumented routes", async () => {
		const app = createExpressApp(async () => Response.json({ ok: true }));
		const server = await listenOrSkip(app);
		if (!server) {
			return;
		}

		try {
			const response = await fetch(`${serverUrl(server)}/api/unknown`);
			expect(response.status).toBe(404);
			expect(await response.json()).toHaveProperty("error");
		} finally {
			await closeServer(server);
		}
	});
});

function serverUrl(server: Server): string {
	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Expected server to listen on a TCP address");
	}
	return `http://127.0.0.1:${address.port}`;
}

function closeServer(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

async function listenOrSkip(app: ReturnType<typeof createExpressApp>) {
	try {
		return await listenExpressApp(app, 0);
	} catch (error) {
		if (isAddrInUseError(error)) {
			return null;
		}
		throw error;
	}
}

function isAddrInUseError(error: unknown): boolean {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return (
		(typeof error === "object" &&
			error !== null &&
			"code" in error &&
			(error as { code?: string }).code === "EADDRINUSE") ||
		message.includes("Failed to find an available port")
	);
}
