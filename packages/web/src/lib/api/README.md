# API client generation status

`ROY-160` evaluates Orval wiring for typed client generation from an OpenAPI contract.

Current branch state:
- No ROY-156 OpenAPI contract file (for example `openapi.yaml`) exists in repository-owned server/web/docs paths.
- Without that source contract, Orval cannot be reliably configured or validated in this worktree.

Fallback implemented:
- `client.types.ts` defines typed request/response contracts.
- `client.ts` provides a minimal typed `fetch` client for the current server API surface (`GET /health`).
- `web-client.ts` creates a browser client that targets `/api/server/*` so Next.js can proxy to the server package.
- `client.typecheck.ts` adds compile-time usage coverage so `bun run --filter web typecheck` verifies the client contract.

Runtime wiring:
- `packages/web/next.config.ts` rewrites `/api/server/:path*` to `${ADHDAI_SERVER_BASE_URL}/:path*`.
- `ADHDAI_SERVER_BASE_URL` defaults to `http://127.0.0.1:3000` when unset.

Next step when ROY-156 OpenAPI lands:
- Add Orval config and generation scripts to emit into `packages/web/src/lib/api/generated`.
