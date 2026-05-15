import type {
	AgentCreateInput,
	AgentUpdateInput,
} from "./features/agents/agents.types";
import type { RunOptions } from "./features/types";

export type AgentsCommand =
	| { action: "list"; projectId?: string; json?: boolean }
	| { action: "show"; id: string; projectId?: string; json?: boolean }
	| { action: "add"; projectId?: string; input: AgentCreateInput }
	| {
			action: "update";
			projectId?: string;
			id: string;
			input: AgentUpdateInput;
	  }
	| { action: "remove"; projectId?: string; id: string };

export type SkillsCommand =
	| { action: "list"; projectId?: string }
	| {
			action: "add";
			projectId?: string;
			title: string;
			description: string;
			content: string;
	  }
	| {
			action: "update";
			projectId?: string;
			name: string;
			title?: string;
			description?: string;
			content?: string;
	  }
	| {
			action: "remove";
			projectId?: string;
			name: string;
	  };

export type TaskCommand = {
	action: "create";
	projectId?: string;
	request?: string;
	nonInteractive?: boolean;
	maxClarificationRounds?: number;
	clarificationAnswers?: Array<{ question: string; answer: string }>;
};

export type CliCommand =
	| { kind: "run"; options: RunOptions }
	| { kind: "status"; issueKey: string; projectId: string }
	| { kind: "projects" }
	| { kind: "agents"; command: AgentsCommand }
	| { kind: "skills"; command: SkillsCommand }
	| { kind: "task"; command: TaskCommand }
	| { kind: "setup"; check: boolean }
	| { kind: "help" };
