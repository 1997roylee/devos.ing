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

## Parallel Processing Operating Guidance

1. This branch does not currently expose user-configurable issue concurrency controls.
2. Standard runs process issue queues sequentially per project.
3. Review-only runs schedule issue tasks in parallel, and each task still acquires per-issue leases and passes through the in-process execution-path lock.
4. Per-issue leases prevent duplicate processing of the same issue key, but they do not serialize all repository mutations across separate ADHD.ai processes.

Safe usage patterns:

1. Shared `executionPath` in a single ADHD.ai process:
   execution-path locking serializes issue execution in-process and helps avoid concurrent checkout mutation.
2. Shared `executionPath` across multiple ADHD.ai processes:
   avoid this layout when possible; process-local locks do not coordinate between processes.
3. Isolated worktrees or distinct `executionPath` per project/process:
   preferred for multi-project unattended automation.
4. Shared `workspacePath` state directories:
   ensure project IDs remain distinct and operator ownership is clear; per-issue leases are scoped by project run-state files.

## Hourly Review Automation Example

Use an hourly review-only automation job to re-run PR review/testing in parallel across resumable runs and squash-merge completed PRs whose complexity score is below the human approval threshold:

```ts
export default {
  automations: {
    jobs: [
      {
        id: "hourly-pr-review",
        schedule: { frequency: "hourly", every: 1, minute: 0 },
        run: { reviewOnly: true, allProjects: true },
      },
    ],
  },
};
```

Run it manually with:

1. `bun run review:hourly`
2. `bun run review:hourly:once`

Per-issue leases still prevent duplicate workers from processing the same issue concurrently.

Review-only jobs can still touch local state and git metadata via downstream stages; keep execution-path isolation in mind for unattended automation layouts.

## Quality Commands

1. `bun run check`
2. `bun run typecheck`
3. `bun test`
