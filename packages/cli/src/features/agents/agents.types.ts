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

export type AgentCreateInput = Omit<AgentProfile, "createdAt" | "updatedAt"> &
	Partial<Pick<AgentProfile, "createdAt" | "updatedAt">>;

export type AgentUpdateInput = Partial<Omit<AgentProfile, "id">>;
