import { createApiClient } from "./client";
import type { HealthResponse } from "./client.types";
import { createWebApiClient } from "./web-client";

const client = createApiClient();
const webClient = createWebApiClient();

const healthResponsePromise: Promise<HealthResponse> = client.getHealth();
const webHealthResponsePromise: Promise<HealthResponse> = webClient.getHealth();

void healthResponsePromise;
void webHealthResponsePromise;
