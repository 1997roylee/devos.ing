import type { AgentRow, SkillRow } from "../db";

export interface AgentCreatePayload {
	id: string;
	name: string;
	backend: string;
	model: string;
	createdAt: string;
}

export interface AgentUpdatePayload {
	name?: string;
	backend?: string;
	model?: string;
	createdAt?: string;
}

export interface SkillCreatePayload {
	id: string;
	name: string;
	description: string;
	source: string;
	updatedAt: string;
}

export interface SkillUpdatePayload {
	name?: string;
	description?: string;
	source?: string;
	updatedAt?: string;
}

export interface CrudRouteMatch {
	entity: "agents" | "skills";
	id: string | null;
}

export interface CrudResponseResult {
	status: number;
	body?: AgentRow | SkillRow | AgentRow[] | SkillRow[] | { error: string };
}
