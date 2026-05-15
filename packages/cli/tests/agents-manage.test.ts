import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	addAgentProfile,
	getAgentProfile,
	listAgentProfiles,
	removeAgentProfile,
	updateAgentProfile,
} from "../src/features/agents/manage";

let tempDir: string | undefined;

afterEach(async () => {
	if (tempDir) {
		await rm(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

describe("agent profile management", () => {
	it("manages agent profiles from the server database", async () => {
		const dbPath = await createDatabasePath();
		const created = await addAgentProfile(dbPath, {
			id: "agent-1",
			title: "Codex Main",
			description: "Primary implementation agent",
			logo: "bot",
			runtime: "codex",
			model: "gpt-5",
			concurrency: 1,
			owner: "owner-1",
			skills: ["typescript"],
			recentWork: ["ROY-229"],
			activity: ["created profile"],
			instructions: "Follow project workflow instructions.",
		});

		expect(created.title).toBe("Codex Main");
		expect(await listAgentProfiles(dbPath)).toHaveLength(1);
		expect(await getAgentProfile(dbPath, "agent-1")).toMatchObject({
			id: "agent-1",
			skills: ["typescript"],
		});

		const updated = await updateAgentProfile(dbPath, "agent-1", {
			concurrency: 2,
			activity: ["updated profile"],
		});
		expect(updated?.concurrency).toBe(2);
		expect(updated?.activity).toEqual(["updated profile"]);

		expect(await removeAgentProfile(dbPath, "agent-1")).toBe(true);
		expect(await listAgentProfiles(dbPath)).toEqual([]);
	});
});

async function createDatabasePath(): Promise<string> {
	tempDir = await mkdtemp(path.join(os.tmpdir(), "adhd-agents-db-"));
	return path.join(tempDir, "server.pgdata");
}
