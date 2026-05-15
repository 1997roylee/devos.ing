import type { AgentsCommand } from "../../args.types";
import { type LoadedConfig, getProjectById } from "../config";
import type { ResolvedProjectConfig } from "../config/runtime.types";
import {
	addAgentProfile,
	getAgentProfile,
	listAgentProfiles,
	removeAgentProfile,
	updateAgentProfile,
} from "./manage";

export async function handleAgentsCommand(
	command: AgentsCommand,
	config: LoadedConfig,
): Promise<void> {
	const project = resolveProject(config, command.projectId);
	const databasePath = project.server.database.databasePath;
	if (command.action === "list") {
		const agents = await listAgentProfiles(databasePath);
		writeAgentList(agents, Boolean(command.json));
		return;
	}
	if (command.action === "show") {
		const agent = await getAgentProfile(databasePath, command.id);
		if (!agent) {
			throw new Error(`Agent '${command.id}' not found`);
		}
		process.stdout.write(`${JSON.stringify(agent, null, 2)}\n`);
		return;
	}
	if (command.action === "add") {
		const created = await addAgentProfile(databasePath, command.input);
		process.stdout.write(`Added agent ${created.id}\n`);
		return;
	}
	if (command.action === "update") {
		const updated = await updateAgentProfile(
			databasePath,
			command.id,
			command.input,
		);
		if (!updated) {
			throw new Error(`Agent '${command.id}' not found`);
		}
		process.stdout.write(`Updated agent ${updated.id}\n`);
		return;
	}
	const removed = await removeAgentProfile(databasePath, command.id);
	if (!removed) {
		throw new Error(`Agent '${command.id}' not found`);
	}
	process.stdout.write(`Removed agent ${command.id}\n`);
}

function resolveProject(
	config: LoadedConfig,
	projectId: string | undefined,
): ResolvedProjectConfig {
	const project = projectId
		? getProjectById(config, projectId)
		: config.projects[0];
	if (projectId && !project) {
		throw new Error(`Project '${projectId}' not found`);
	}
	if (!project) {
		throw new Error("No project is configured");
	}
	return project;
}

function writeAgentList(
	agents: Awaited<ReturnType<typeof listAgentProfiles>>,
	json: boolean,
): void {
	if (json) {
		process.stdout.write(`${JSON.stringify(agents, null, 2)}\n`);
		return;
	}
	for (const agent of agents) {
		process.stdout.write(
			`${[
				agent.id,
				agent.title,
				`runtime=${agent.runtime}`,
				`model=${agent.model}`,
				`owner=${agent.owner}`,
				`concurrency=${agent.concurrency}`,
			].join("\t")}\n`,
		);
	}
}
