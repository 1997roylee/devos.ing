import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const serverBaseUrl =
	process.env.ADHDAI_SERVER_BASE_URL ?? "http://127.0.0.1:3000";
const workspaceRoot = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

const nextConfig: NextConfig = {
	reactStrictMode: true,
	turbopack: {
		root: workspaceRoot,
	},
	async rewrites() {
		return [
			{
				source: "/api/server/:path*",
				destination: `${serverBaseUrl}/:path*`,
			},
		];
	},
};

export default nextConfig;
