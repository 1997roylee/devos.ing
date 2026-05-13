import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const gitPath = ".git";
const permissionFailurePatterns = [
	/could not lock config file/i,
	/operation not permitted/i,
	/permission denied/i,
];

const isHuskyDisabled = process.env.HUSKY === "0";

if (isHuskyDisabled) {
	console.log("HUSKY=0 skip install");
	process.exit(0);
}

if (!existsSync(gitPath)) {
	console.log("Skipping Husky install: .git is not present.");
	process.exit(0);
}

const result = spawnSync("husky", [], {
	encoding: "utf8",
	stdio: ["ignore", "pipe", "pipe"],
});

const stderr = result.stderr ?? "";
const stdout = result.stdout ?? "";
const output = `${stderr}\n${stdout}`;

if (permissionFailurePatterns.some((pattern) => pattern.test(output))) {
	console.warn("Skipping Husky install: Git hook config is not writable.");
	process.exit(0);
}

if (stdout) {
	process.stdout.write(stdout);
}

if (result.status === 0) {
	if (stderr) {
		process.stderr.write(stderr);
	}
	process.exit(0);
}

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

if (stderr) {
	process.stderr.write(stderr);
}

process.exit(result.status ?? 1);
