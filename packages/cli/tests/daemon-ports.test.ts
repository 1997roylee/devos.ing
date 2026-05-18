import { describe, expect, it } from "bun:test";
import {
	buildDaemonCommands,
	runProductionDaemon,
} from "../src/features/daemon";
import { resolveDaemonPorts } from "../src/features/daemon/daemon-ports";

describe("daemon port resolution", () => {
	it("uses distinct default ports for web, server, and cli daemon", () => {
		expect(resolveDaemonPorts({})).toEqual({
			serverPort: "3001",
			webPort: "3000",
			cliDaemonPort: 3002,
		});
	});

	it("rejects duplicate daemon service ports", () => {
		expect(() =>
			buildDaemonCommands({ PIV_SERVER_PORT: "4101", PORT: "4101" }),
		).toThrow("server (PIV_SERVER_PORT) and web (PORT)");

		expect(() =>
			buildDaemonCommands({
				PIV_SERVER_PORT: "4101",
				DEVOS_CLI_DAEMON_PORT: "4101",
			}),
		).toThrow("server (PIV_SERVER_PORT) and cli (DEVOS_CLI_DAEMON_PORT)");

		expect(() =>
			buildDaemonCommands({
				PORT: "4102",
				DEVOS_CLI_DAEMON_PORT: "4102",
			}),
		).toThrow("web (PORT) and cli (DEVOS_CLI_DAEMON_PORT)");
	});

	it("rejects invalid server and web ports", () => {
		expect(() => buildDaemonCommands({ PIV_SERVER_PORT: "abc" })).toThrow(
			"PIV_SERVER_PORT must be a valid TCP port",
		);
		expect(() => buildDaemonCommands({ PORT: "70000" })).toThrow(
			"PORT must be a valid TCP port",
		);
	});

	it("validates port conflicts before starting production daemon children", async () => {
		let commandDaemonStarted = false;
		let childSpawned = false;

		await expect(
			runProductionDaemon({
				env: { PIV_SERVER_PORT: "4101", PORT: "4101" },
				startCommandDaemon: () => {
					commandDaemonStarted = true;
					return { port: 4103, stop: async () => {} };
				},
				spawnChild: () => {
					childSpawned = true;
					throw new Error("should not spawn");
				},
			}),
		).rejects.toThrow("Daemon port conflict");

		expect(commandDaemonStarted).toBe(false);
		expect(childSpawned).toBe(false);
	});
});
