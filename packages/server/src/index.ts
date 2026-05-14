import path from "node:path";
import {
	CliCommandExecutor,
	initializeServerDatabase,
} from "adhdai/features/server";
import { createHandleRequest } from "./app";
import { createReadRepositories } from "./repositories";

const DEFAULT_DATABASE_PATH = path.resolve(
	process.cwd(),
	".piv-loop/state/server-db",
);

export const startServer = async (
	port = 3000,
): Promise<Bun.Server<undefined>> => {
	const databasePath =
		process.env.ADHDAI_SERVER_DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
	const database = await initializeServerDatabase(databasePath);
	const repositories = createReadRepositories(database);

	return Bun.serve({
		port,
		fetch: createHandleRequest({
			cliExecutor: new CliCommandExecutor({
				cwd: process.cwd(),
				command: "bun",
				baseArgs: ["run", "./packages/cli/src/index.ts"],
			}),
			repository: {
				database: null,
			},
		}),
	});
};

if (import.meta.main) {
	void startServer();
}
