import { createApiClient } from "./client";
import type { ApiClient } from "./client.types";

const WEB_SERVER_PROXY_BASE_URL = "/api/server";

export function createWebApiClient(): ApiClient {
	return createApiClient({ baseUrl: WEB_SERVER_PROXY_BASE_URL });
}
