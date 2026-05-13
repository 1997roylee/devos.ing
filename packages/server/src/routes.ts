import {
	jsonSuccess,
	methodNotAllowedResponse,
	notFoundJsonResponse,
	serverErrorResponse,
} from "./http/response";
import type { ServerRouteDeps } from "./routes.types";

type RouteHandler = (deps: ServerRouteDeps) => Promise<unknown>;

export const READ_ONLY_SERVER_PATHS = [
	"/api/token-usage",
	"/api/jobs",
	"/api/agents",
	"/api/skills",
	"/api/command-history",
	"/api/project-boards",
	"/api/board-projects",
	"/api/board-tasks",
] as const;

const routes: Record<string, RouteHandler> = {
	"/api/token-usage": (deps) => deps.repositories.listTokenUsage(),
	"/api/jobs": (deps) => deps.repositories.listJobs(),
	"/api/agents": (deps) => deps.repositories.listAgents(),
	"/api/skills": (deps) => deps.repositories.listSkills(),
	"/api/command-history": (deps) => deps.repositories.listCommandHistory(),
	"/api/project-boards": (deps) => deps.repositories.listProjectBoards(),
	"/api/board-projects": (deps) => deps.repositories.listBoardProjects(),
	"/api/board-tasks": (deps) => deps.repositories.listBoardTasks(),
};

export async function handleServerRequest(
	request: Request,
	deps: ServerRouteDeps,
): Promise<Response> {
	if (request.method !== "GET") {
		return methodNotAllowedResponse();
	}

	const url = new URL(request.url);
	const handler = routes[url.pathname];
	if (!handler) {
		return notFoundJsonResponse();
	}

	try {
		return jsonSuccess(await handler(deps));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return serverErrorResponse(message);
	}
}
