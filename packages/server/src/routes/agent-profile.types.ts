import type { NewAgentRow } from "../db";

export interface AgentProfile {
	id: string;
	title: string;
	description: string;
	logo: string;
	runtime: string;
	model: string;
	concurrency: number;
	owner: string;
	createdAt: string;
	updatedAt: string;
	skills: string[];
	recentWork: string[];
	activity: string[];
	instructions: string;
}

export type AgentCreatePayload = AgentProfile;

export type AgentUpdatePayload = Partial<Omit<AgentProfile, "id">>;

export type AgentProfileInsert = NewAgentRow;
