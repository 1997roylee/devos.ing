export type WorkflowTab = "overview" | "reviews";

export interface AgentHealthViewModel {
	status: "loading" | "healthy" | "error";
	summary: string;
}
