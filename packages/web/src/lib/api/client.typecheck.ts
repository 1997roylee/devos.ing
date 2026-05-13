import { createApiClient } from "./client";
import type { HealthResponse } from "./client.types";

const client = createApiClient();

const healthResponsePromise: Promise<HealthResponse> = client.getHealth();

void healthResponsePromise;
