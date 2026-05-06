# PIV Loop (Codex CLI Orchestrator)

PIV Loop is a Bun + TypeScript CLI that automates a Linear-to-Codex-to-GitHub workflow across one or many projects.

## Workflow

1. Pull assigned Linear issues.
2. Run plan and implement in the same Codex session.
3. Open a draft PR after implementation.
4. Run review/testing in a separate Codex session.
5. Post review comments and create GitHub issues for detected bugs.
6. Keep Linear status synchronized per stage.

## Multi-Project Configuration

Configuration is loaded from `piv-loop.config.ts` and resolved into project-specific runtime settings.

- Root defaults can define shared repo, linear, codex, skills, and dry-run behavior.
- `projects` contains one or more project entries, each with:
  - `id` (required)
  - `name` (optional)
  - overrides such as `workspacePath`, `repo`, `linear`, `codex`, `skills`, `dryRun`

Run state is namespaced per project at:

` .piv-loop/projects/<project-id>/runs/<LINEAR_KEY>.json `

Legacy fallback for default project:

` .piv-loop/runs/<LINEAR_KEY>.json `

## Commands

```bash
bun run src/index.ts run --project default
bun run src/index.ts run --all-projects
bun run src/index.ts run --project default --issue ENG-123
bun run src/index.ts status --project default --issue ENG-123
bun run src/index.ts projects
```

## Required Environment

Set these variables before running:

- `LINEAR_API_KEY`
- `LINEAR_STATUS_ASSIGNED`
- `LINEAR_STATUS_PLANNING`
- `LINEAR_STATUS_IMPLEMENTING`
- `LINEAR_STATUS_PR_CREATED`
- `LINEAR_STATUS_REVIEWING`
- `LINEAR_STATUS_TESTING`
- `LINEAR_STATUS_BLOCKED`
- `LINEAR_STATUS_DONE`

Optional:

- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_BASE_BRANCH` (default `main`)
- `PIV_WORKSPACE_PATH` (default current directory)
- `PIV_DRY_RUN=1` to avoid Linear/GitHub mutations
- `CODEX_HOME` to override Codex runtime state directory

## Quality Commands

```bash
bun run check
bun run typecheck
bun test
```

## Notes

- Run with authenticated `gh` (`gh auth status`).
- Codex sessions default to a local writable `CODEX_HOME` at `.piv-loop/codex-home/<project-id>`.
