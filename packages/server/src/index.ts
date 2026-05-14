import path from "node:path";
import { CliCommandExecutor } from "adhdai/features/server/cli-command-executor";
import { createHandleRequest } from "./app";
import { createBoardReadModels } from "./board-read-models";
import { initializeServerDatabase } from "./db";

const DEFAULT_SERVER_DB_PATH = path.join(
	process.cwd(),
	".piv-loop",
	"config",
	"server-db",
);

export async function startServer(port = 3000): Promise<Bun.Server<undefined>> {
	const databasePath =
		process.env.PIV_SERVER_DATABASE_PATH ?? DEFAULT_SERVER_DB_PATH;
	const serverDatabase = await initializeServerDatabase(databasePath);
	return Bun.serve({
		port,
		fetch: createHandleRequest({
			persistence,
			cliExecutor: new CliCommandExecutor({
				cwd,
				command: "bun",
				baseArgs: ["run", "./packages/cli/src/index.ts"],
			}),
			boardReadModels: createBoardReadModels(serverDatabase.db),
		}),
	});
}

if (import.meta.main) {
	await startServer();
}
