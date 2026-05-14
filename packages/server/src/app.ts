import type { AppDeps, RouteHandler } from "./app.types";
import { handleEntityCrudRequest, matchCrudRoute } from "./routes/entity-crud";

const UNSAFE_RAW_COMMAND_FIELDS = ["command", "cmd", "args", "argv", "shell"];

export function createHandleRequest(deps: AppDeps): RouteHandler {
	return async (request) => {
		if (matchesPath(request, "/health")) {
			const methodResult = ensureMethod(request, "GET");
			if (methodResult.status === "error") {
				return methodResult.response;
			}
			return jsonSuccess({ status: "ok" });
		}

		const cliResponse = await handleCliRoute(
			request,
			deps.cliExecutor,
			pathname,
		);
		if (cliResponse) {
			return cliResponse;
		}

		const projectResponse = await handleProjectsRoute(
			request,
			deps.db,
			pathname,
		);
		if (projectResponse) {
			return projectResponse;
		}

		const taskResponse = await handleTasksRoute(request, deps.db, pathname);
		if (taskResponse) {
			return taskResponse;
		}

		const crudRoute = matchCrudRoute(pathname);
		if (crudRoute) {
			const result = await handleEntityCrudRequest(request, deps, crudRoute);
			if (result?.body === undefined) {
				return new Response(null, { status: result.status });
			}
			return Response.json(result.body, { status: result.status });
		}

		return new Response("Not Found", { status: 404 });
	};
}

export const handleRequest: RouteHandler = (request) => {
	if (matchesPath(request, "/health")) {
		if (request.method !== "GET") {
			return methodNotAllowedResponse();
		}
		return jsonSuccess({ status: "ok" });
	}

	return notFoundResponse();
};
