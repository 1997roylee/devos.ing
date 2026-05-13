# ADHD.ai Agent Entry

This repository orchestrates multi-project agent workflows across CLI, server,
and web UI packages. Keep behavior project-agnostic and avoid coupling logic to a
single workspace.

## Shared Must-Follow Rules

1. Before executing agent workflow work, pull the latest code from `main` so runs
   start from current repository state. Fetch `origin/main`, update the local
   `main` with a fast-forward-only pull, and do not proceed from stale code.
2. Use Bun for all package management, scripts, workspace filters, and tests.
   Do not add npm, Yarn, or pnpm lockfiles or package-manager-specific config.
3. Do not construct raw shell command strings in workflow logic; use helper
   modules that pass command arguments as structured arrays.
4. Keep TypeScript files under 250 lines; split files before they grow beyond
   that limit.
5. Keep TypeScript interfaces/type aliases in dedicated `*.types.ts` modules
   separate from runtime implementation when adding or changing contracts.
6. Keep review parsing contract stable:
   - `RESULT: PASS|FAIL`
   - `SUMMARY: ...`
   - `BUGS_JSON: [...]`

## Package Ownership Map

- `packages/cli/`: CLI parsing, config resolution, workflow orchestration,
  run-state handling, integrations, and agent adapters.
- `packages/server/`: HTTP/API server runtime, request handling, server
  contracts, health/readiness behavior, and server-specific tests.
- `packages/web/`: Next.js operator UI, client-side data access, providers,
  components, styles, and frontend verification.

Package-local `AGENTS.md` files add instructions for each workspace. Follow the
root rules everywhere, then follow the closest package-specific file for the
code you are changing.

## Quality Gates

Run all checks before finalizing changes:

1. `bun run check`
2. `bun run typecheck`
3. `bun test`

## Documentation Map

- Architecture details:
  [ARCHITECTURE.md](ARCHITECTURE.md)
- Execution and operating plans:
  [docs/PLANS.md](docs/PLANS.md)
- Reliability and run behavior:
  [docs/RELIABILITY.md](docs/RELIABILITY.md)
- Security and secrets handling:
  [docs/SECURITY.md](docs/SECURITY.md)
