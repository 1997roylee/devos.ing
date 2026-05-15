import { describe, expect, it } from "bun:test";

import {
	type AgentRow,
	type ServerDatabase,
	agentsTable,
	initializeServerDatabase,
	runMigrations,
} from "devos-server/db";

describe("db boundary export", () => {
	it("exports db runtime and schema symbols through devos-server/db", () => {
		expect(typeof initializeServerDatabase).toBe("function");
		expect(typeof runMigrations).toBe("function");
		expect(agentsTable).toBeDefined();

		const typedRow: AgentRow = {
			id: "agent-1",
			title: "Codex",
			description: "Primary implementation agent",
			logo: "bot",
			runtime: "codex",
			model: "gpt-5",
			concurrency: 1,
			owner: "owner-1",
			createdAt: "2026-05-13 00:00:00",
			updatedAt: "2026-05-13 00:00:00",
			skills: "[]",
			recentWork: "[]",
			activity: "[]",
			instructions: "Follow instructions.",
		};
		expect(typedRow.id).toBe("agent-1");

		type CloseFn = ServerDatabase["close"];
		const closeFn: CloseFn = async () => {};
		expect(typeof closeFn).toBe("function");
	});
});
