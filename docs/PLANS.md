# Plans

Execution plans and plan artifacts are tracked under `docs/exec-plans/`.

## Workflow Plan Contract

Planning output should remain concise and implementation-focused, including:

1. scope summary
2. implementation steps
3. test plan
4. known risks

## Operating Commands

1. `bun run src/index.ts run --project default`
2. `bun run src/index.ts run --all-projects`
3. `bun run src/index.ts status --project default --issue ENG-123`
4. `bun run src/index.ts projects`

## Quality Commands

1. `bun run check`
2. `bun run typecheck`
3. `bun test`
