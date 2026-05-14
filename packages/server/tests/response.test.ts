import { describe, expect, it } from "bun:test";
import {
	badRequestResponse,
	jsonError,
	jsonSuccess,
	methodNotAllowedResponse,
	notFoundJsonResponse,
	notFoundResponse,
	serverErrorResponse,
} from "../src/http/response";

describe("http response helpers", () => {
	it("renders success JSON with default status", async () => {
		const response = jsonSuccess({ status: "ok" });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	it("renders success JSON with custom status", async () => {
		const response = jsonSuccess({ status: "accepted" }, { status: 202 });
		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ status: "accepted" });
	});

	it("renders error JSON with default status", async () => {
		const response = jsonError("bad");
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "bad" });
	});

	it("renders error JSON with custom status", async () => {
		const response = jsonError("boom", { status: 502 });
		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: "boom" });
	});

	it("renders method-not-allowed response", async () => {
		const response = methodNotAllowedResponse();
		expect(response.status).toBe(405);
		expect(await response.json()).toEqual({ error: "Method Not Allowed" });
	});

	it("renders JSON and text not-found variants", async () => {
		const jsonNotFound = notFoundJsonResponse();
		expect(jsonNotFound.status).toBe(404);
		expect(await jsonNotFound.json()).toEqual({ error: "Not Found" });

		const textNotFound = notFoundResponse();
		expect(textNotFound.status).toBe(404);
		expect(await textNotFound.text()).toBe("Not Found");
	});

	it("renders convenience error helpers", async () => {
		const badRequest = badRequestResponse("bad");
		expect(badRequest.status).toBe(400);
		expect(await badRequest.json()).toEqual({ error: "bad" });

		const serverError = serverErrorResponse("internal");
		expect(serverError.status).toBe(500);
		expect(await serverError.json()).toEqual({ error: "internal" });
	});
});
