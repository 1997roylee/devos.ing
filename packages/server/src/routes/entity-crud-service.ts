import {
	toAgentRecord,
	toStoredAgentCreatePayload,
	toStoredAgentUpdatePayload,
} from "./entity-crud-agent";
import type {
	EntityCrudRepository,
	EntityCrudService,
} from "./entity-crud-service.types";

export function createEntityCrudService(
	repository: EntityCrudRepository,
): EntityCrudService {
	return {
		async listAgents() {
			const rows = await repository.listAgents();
			return { status: "ok", value: rows.map((row) => toAgentRecord(row)) };
		},
		async getAgent(id) {
			const row = await repository.getAgent(id);
			return row
				? { status: "ok", value: toAgentRecord(row) }
				: { status: "not_found" };
		},
		async createAgent(input) {
			const created = await repository.createAgent(
				toStoredAgentCreatePayload(input),
			);
			return { status: "ok", value: toAgentRecord(created) };
		},
		async updateAgent(id, input) {
			const updated = await repository.updateAgent(
				id,
				toStoredAgentUpdatePayload(input),
			);
			return updated
				? { status: "ok", value: toAgentRecord(updated) }
				: { status: "not_found" };
		},
		async deleteAgent(id) {
			return (await repository.deleteAgent(id))
				? { status: "deleted" }
				: { status: "not_found" };
		},
		async listSkills() {
			return { status: "ok", value: await repository.listSkills() };
		},
		async getSkill(id) {
			const row = await repository.getSkill(id);
			return row ? { status: "ok", value: row } : { status: "not_found" };
		},
		async createSkill(input) {
			return { status: "ok", value: await repository.createSkill(input) };
		},
		async updateSkill(id, input) {
			const updated = await repository.updateSkill(id, input);
			return updated
				? { status: "ok", value: updated }
				: { status: "not_found" };
		},
		async deleteSkill(id) {
			return (await repository.deleteSkill(id))
				? { status: "deleted" }
				: { status: "not_found" };
		},
	};
}
