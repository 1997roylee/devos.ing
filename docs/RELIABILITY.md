# Reliability

## Runtime Expectations

1. Each run resolves to one or more `project.id` values.
2. Project-scoped state is persisted under `.piv-loop/projects/<project-id>/runs`.
3. Status reads require explicit project id context.
4. Default non-project invocation runs against the first configured project.

## Polling and Recovery

1. Polling is configured globally (`intervalMs`, `maxCycles`, `exitWhenIdle`, `staleRunTimeoutMs`).
2. In-progress runs acquire a per-issue lease to prevent duplicate workers from processing the same issue concurrently.
3. Stale in-progress runs are eligible for requeue only after lease expiry and timeout.
4. `--all-projects --issue` must resolve to one unique project mapping.

## Verification Signal Contract

Review/testing output must preserve:

- `RESULT: PASS|FAIL`
- `SUMMARY: ...`
- `BUGS_JSON: [...]`

## Planning Decomposition Contract

Planning output can optionally include:

- `COMPLEXITY: SIMPLE|COMPLEX`
- `SPLIT_TASKS_JSON: [...]` (required only when complexity is `COMPLEX`)

When `COMPLEXITY: COMPLEX` is returned, ADHD.ai creates child Linear tasks from `SPLIT_TASKS_JSON` and completes the parent issue without entering implementation/review stages.

## Docker Isolated Codex Execution

Docker-backed Codex execution is optional. Host execution remains the default unless Docker is explicitly enabled with `codex.docker.enabled: true` or `CODEX_DOCKER_ENABLED=true`.

Supported Docker configuration:

- `codex.docker.enabled` / `CODEX_DOCKER_ENABLED`
- `codex.docker.image` / `CODEX_DOCKER_IMAGE`
- `codex.docker.binary` / `CODEX_DOCKER_BINARY`
- `codex.docker.workspacePath` / `CODEX_DOCKER_WORKSPACE_PATH`
- `codex.docker.executionPath` / `CODEX_DOCKER_EXECUTION_PATH`
- `codex.docker.codexHomePath` / `CODEX_DOCKER_CODEX_HOME_PATH`
- `codex.codexHome` / `CODEX_HOME`

Runtime mount behavior (from `src/agent-adapters/codex-docker.ts`):

1. `workspacePath` mounts to `/workspace` by default.
2. If `executionPath` is inside `workspacePath`, the container execution path is mapped under `/workspace` (for example `/workspace/repo/subdir`).
3. If `executionPath` is outside `workspacePath`, it is mounted separately and defaults to `/workspace/repo`.
4. If `CODEX_HOME` is set, it is mounted and exported inside the container as `/codex-home` by default.

Image expectations:

1. The image must include the configured Codex binary (default: `codex`).
2. The image should include workflow dependencies such as `git`, `gh`, `bun`, and any project-required build/test tooling.
3. The container user must be able to read and write mounted repository paths, `.piv-loop` state/output paths, and mounted `CODEX_HOME` when present.

Example: enable Docker via environment

```bash
CODEX_DOCKER_ENABLED=true
CODEX_DOCKER_IMAGE=codex:latest
CODEX_DOCKER_BINARY=docker
CODEX_DOCKER_WORKSPACE_PATH=/workspace
CODEX_DOCKER_EXECUTION_PATH=/workspace/repo
CODEX_DOCKER_CODEX_HOME_PATH=/codex-home
CODEX_HOME=/Users/you/.codex
```

Example: enable Docker in config (`adhd-ai.config.ts`)

```ts
export default {
  codex: {
    docker: {
      enabled: true,
      image: "codex:latest",
      binary: "docker",
      workspacePath: "/workspace",
      executionPath: "/workspace/repo",
      codexHomePath: "/codex-home",
    },
    codexHome: "/Users/you/.codex",
  },
  projects: [{ id: "default" }],
};
```

For security caveats around mounted paths, permissions, and credential exposure, see [docs/SECURITY.md](SECURITY.md).
