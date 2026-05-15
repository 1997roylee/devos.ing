import type { SkillRow } from "../db";
import type {
	AgentCreatePayload,
	AgentProfile,
	AgentUpdatePayload,
} from "./agent-profile.types";

export type { AgentCreatePayload, AgentUpdatePayload };

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
	body?:
		| AgentProfile
		| SkillRow
		| AgentProfile[]
		| SkillRow[]
		| { error: string };
}
