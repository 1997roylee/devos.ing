# Reliability

## Runtime Expectations

1. Each run resolves to one or more `project.id` values.
2. Project-scoped state is persisted under `.piv-loop/projects/<project-id>/runs`.
3. Status reads require explicit project id context.
4. Default non-project invocation runs against the first configured project.

## Polling and Recovery

1. Polling is configured globally (`intervalMs`, `maxCycles`, `exitWhenIdle`, `staleRunTimeoutMs`).
2. Stale in-progress runs are eligible for requeue after timeout.
3. `--all-projects --issue` must resolve to one unique project mapping.

## Verification Signal Contract

Review/testing output must preserve:

- `RESULT: PASS|FAIL`
- `SUMMARY: ...`
- `BUGS_JSON: [...]`
