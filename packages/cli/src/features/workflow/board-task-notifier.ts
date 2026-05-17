import { logger, normalizeError } from "../../utils/logger";

const TASK_CHANGED_PATH = "/api/internal/daemon/task-changed";

export type BoardTaskNotifierFetch = typeof fetch;

export async function notifyBoardTaskChanged(
	taskId: string,
	options: {
		env?: NodeJS.ProcessEnv;
		fetchImpl?: BoardTaskNotifierFetch;
	} = {},
): Promise<void> {
	const env = options.env ?? process.env;
	const baseUrl = env.DEVOS_SERVER_BASE_URL;
	if (!baseUrl) {
		return;
	}

	let url: string;
	try {
		url = new URL(TASK_CHANGED_PATH, baseUrl).toString();
	} catch (error) {
		logger.warn(
			{ taskId, baseUrl, err: normalizeError(error) },
			"Invalid server URL for daemon task notification",
		);
		return;
	}

	try {
		const response = await (options.fetchImpl ?? fetch)(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ taskId }),
		});
		if (!response.ok) {
			logger.warn(
				{ taskId, status: response.status },
				"Server rejected daemon task notification",
			);
		}
	} catch (error) {
		logger.warn(
			{ taskId, err: normalizeError(error) },
			"Failed to notify server about daemon task change",
		);
	}
}
