const userAgent = process.env.npm_config_user_agent ?? "";
const isBunRuntime = Boolean(process.versions.bun);
const isBunPackageManager = userAgent === "" || userAgent.startsWith("bun/");

if (!isBunRuntime || !isBunPackageManager) {
	console.error("This workspace uses Bun only. Run `bun install` instead.");
	process.exit(1);
}
