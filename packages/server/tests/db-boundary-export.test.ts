import { describe, expect, it } from "bun:test";

import {
	type AgentRow,
	agentsTable,
	initializeServerDatabase,
	runMigrations,
} from "adhdai-server/db";

describe("db boundary export", () => {
	it("exports db runtime and schema symbols through adhdai-server/db", () => {
		expect(typeof initializeServerDatabase).toBe("function");
		expect(typeof runMigrations).toBe("function");
		expect(agentsTable).toBeDefined();

		const typedRow: AgentRow = {
			id: "agent-1",
			name: "codex",
			backend: "codex",
			model: "gpt-5",
			createdAt: "2026-05-13 00:00:00",
		};
		expect(typedRow.id).toBe("agent-1");
	});
});
