import type { BoardRepository } from "../board";
import {
	jsonSuccess,
	methodNotAllowedResponse,
	notFoundJsonResponse,
	serverErrorResponse,
} from "./response";

const WORKSPACE_PROJECTS_ROUTE = /^\/api\/workspaces\/([^/]+)\/projects\/?$/;
const WORKSPACE_PROJECT_BOARD_ROUTE =
	/^\/api\/workspaces\/([^/]+)\/projects\/([^/]+)\/board\/?$/;

export async function handleWorkspaceBoardRoute(
	request: Request,
	boardRepository: BoardRepository | undefined,
	pathname: string,
): Promise<Response | null> {
	const projectMatch = pathname.match(WORKSPACE_PROJECTS_ROUTE);
	if (projectMatch) {
		if (request.method !== "GET") {
			return methodNotAllowedResponse();
		}
		if (!boardRepository) {
			return serverErrorResponse("Board repository not configured");
		}
		const workspaceId = decodeURIComponent(projectMatch[1] ?? "");
		if (workspaceId.length === 0) {
			return notFoundJsonResponse();
		}
		const projects = await boardRepository.listWorkspaceProjects(workspaceId);
		return jsonSuccess({ workspaceId, projects });
	}

	const boardMatch = pathname.match(WORKSPACE_PROJECT_BOARD_ROUTE);
	if (!boardMatch) {
		return null;
	}
	if (request.method !== "GET") {
		return methodNotAllowedResponse();
	}
	if (!boardRepository) {
		return serverErrorResponse("Board repository not configured");
	}
	const workspaceId = decodeURIComponent(boardMatch[1] ?? "");
	const projectId = decodeURIComponent(boardMatch[2] ?? "");
	if (workspaceId.length === 0 || projectId.length === 0) {
		return notFoundJsonResponse();
	}
	const board = await boardRepository.getWorkspaceProjectBoard(
		workspaceId,
		projectId,
	);
	return board ? jsonSuccess(board) : notFoundJsonResponse();
}
