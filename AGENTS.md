# ADHD.ai Agent Entry

This repository orchestrates multi-project agent workflows. Keep behavior project-agnostic and avoid coupling logic to a single workspace.

## Must-Follow Rules

1. Resolve env vars and config only in `src/config.ts`.
2. Keep stage transitions and sequencing in `src/workflow.ts`.
3. Keep integrations isolated in `src/linear.ts`, `src/github.ts`, and `src/codex.ts`.
4. Keep run-state path logic in `src/state.ts`.
5. Keep CLI parsing and dispatch in `src/args.ts` and `src/index.ts`.
6. Do not construct raw shell command strings in workflow logic; use helper modules.
7. Keep review parsing contract stable:
   - `RESULT: PASS|FAIL`
   - `SUMMARY: ...`
   - `BUGS_JSON: [...]`
8. Add tests for any new CLI flag, config shape, state path, or stage transition.

## Quality Gates

Run all checks before finalizing changes:

1. `bun run check`
2. `bun run typecheck`
3. `bun test`

## Documentation Map

- Architecture details: [ARCHITECTURE.md](/Users/roy/Desktop/SourceCode/agentic/show-me-ur-agents/ARCHITECTURE.md)
- Execution and operating plans: [docs/PLANS.md](/Users/roy/Desktop/SourceCode/agentic/show-me-ur-agents/docs/PLANS.md)
- Reliability and run behavior: [docs/RELIABILITY.md](/Users/roy/Desktop/SourceCode/agentic/show-me-ur-agents/docs/RELIABILITY.md)
- Security and secrets handling: [docs/SECURITY.md](/Users/roy/Desktop/SourceCode/agentic/show-me-ur-agents/docs/SECURITY.md)
