# ADHD.ai Agent Alignment

This repository supports multi-project orchestration. Keep behavior consistent across projects and avoid coupling workflow logic to one workspace.

## Architecture Guardrails

1. `src/config.ts` is the only place that resolves env vars and config files into project runtime config.
2. `src/workflow.ts` owns stage transitions and orchestration sequencing.
3. Integration modules stay isolated:
   - `src/linear.ts`
   - `src/github.ts`
   - `src/codex.ts`
4. `src/state.ts` owns run-state paths and compatibility fallback.
5. CLI parsing and command dispatch live in:
   - `src/args.ts`
   - `src/index.ts`

## Multi-Project Rules

1. Every run must resolve to one or more `project.id` values.
2. Persist run state under `.piv-loop/projects/<project-id>/runs`.
3. Status reads require an explicit project id.
4. Default invocation without project flags runs the first configured project.

## Coding Rules

1. Do not read env vars outside `src/config.ts`.
2. Do not construct raw shell command strings in workflow logic; use helper modules.
3. Keep parsing contracts stable for review output:
   - `RESULT: PASS|FAIL`
   - `SUMMARY: ...`
   - `BUGS_JSON: [...]`
4. Add tests for any new CLI flag, config shape, state path, or stage transition.

## Quality Gates

Run all of these before finalizing changes:

1. `bun run check`
2. `bun run typecheck`
3. `bun test`
