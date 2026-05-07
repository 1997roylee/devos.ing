# New User Onboarding

## Goal

Get a new operator from zero setup to running a scoped project workflow.

## Preconditions

1. Repository is cloned.
2. `bun` and `gh` are installed.
3. Linear and GitHub credentials are available.

## Setup

1. Configure required environment variables:
   - `LINEAR_API_KEY`
   - `LINEAR_STATUS_ASSIGNED`
   - `LINEAR_STATUS_PLANNING`
   - `LINEAR_STATUS_IMPLEMENTING`
   - `LINEAR_STATUS_PR_CREATED`
   - `LINEAR_STATUS_REVIEWING`
   - `LINEAR_STATUS_TESTING`
   - `LINEAR_STATUS_BLOCKED`
   - `LINEAR_STATUS_DONE`
2. Review `adhd-ai.config.ts` and confirm `projects[]` entries, `project.id`, and paths.
3. Verify GitHub auth with `gh auth status`.

## First Run

1. Run `bun run src/index.ts projects` to verify project resolution.
2. Run `bun run src/index.ts run --project <PROJECT_ID>` for one scoped project.
3. Validate run state appears under `.piv-loop/projects/<project-id>/runs`.

## Success Criteria

1. One issue is picked up for the selected project.
2. Stage transitions reach planning and implementation.
3. Linear comments reflect workflow progress.
