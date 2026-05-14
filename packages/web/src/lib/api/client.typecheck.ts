import { createApiClient } from "./client";
import type {
	HealthResponse,
	TaskCreateRequest,
	TaskCreateResponse,
} from "./client.types";
import { createWebApiClient } from "./web-client";

const client = createApiClient();
const webClient = createWebApiClient();

const healthResponsePromise: Promise<HealthResponse> = client.getHealth();
const webHealthResponsePromise: Promise<HealthResponse> = webClient.getHealth();
const taskCreateRequest: TaskCreateRequest = {
	request: "Create a task from web UI",
};
const taskCreateResponsePromise: Promise<TaskCreateResponse> =
	webClient.createTask(taskCreateRequest);

void healthResponsePromise;
void webHealthResponsePromise;
void taskCreateResponsePromise;
