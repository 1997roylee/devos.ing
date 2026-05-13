import { createApiClient } from "./client";
import type {
	AgentRecord,
	CommandHistoryRecord,
	HealthResponse,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./client.types";
import {
	useAgentsQuery,
	useCommandHistoryQuery,
	useJobsQuery,
	useSkillsQuery,
	useTokenUsageQuery,
} from "./queries";

const client = createApiClient();

const healthResponsePromise: Promise<HealthResponse> = client.getHealth();
const tokenUsagePromise: Promise<TokenUsageRecord[]> = client.listTokenUsage();
const jobsPromise: Promise<JobRecord[]> = client.listJobs();
const agentsPromise: Promise<AgentRecord[]> = client.listAgents();
const skillsPromise: Promise<SkillRecord[]> = client.listSkills();
const commandHistoryPromise: Promise<CommandHistoryRecord[]> =
	client.listCommandHistory();

const tokenUsageHook = useTokenUsageQuery({ enabled: false });
const jobsHook = useJobsQuery({ enabled: false });
const agentsHook = useAgentsQuery({ enabled: false });
const skillsHook = useSkillsQuery({ enabled: false });
const commandHistoryHook = useCommandHistoryQuery({ enabled: false });

void healthResponsePromise;
void tokenUsagePromise;
void jobsPromise;
void agentsPromise;
void skillsPromise;
void commandHistoryPromise;
void tokenUsageHook;
void jobsHook;
void agentsHook;
void skillsHook;
void commandHistoryHook;
