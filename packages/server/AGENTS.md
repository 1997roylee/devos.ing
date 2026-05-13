# devos.ing Server Agent Instructions

The server package owns the HTTP/API runtime for operator-facing services. Keep
server code focused on request handling, API process concerns, and explicit
boundaries to CLI or shared behavior.

## Ownership Rules

1. Keep server runtime and HTTP/API process concerns under
   `packages/server/src/`.
2. Keep request handlers small and route behavior explicit.
3. Keep server contracts in dedicated `*.types.ts` modules separate from runtime
   implementation.
4. Do not duplicate CLI workflow, config, or integration business logic in the
   server package.
5. Call CLI-facing or shared APIs only through explicit boundaries. If a new
   boundary is needed, define the contract first, then keep the runtime adapter
   narrow.
6. Keep health and readiness behavior simple, deterministic, and covered by
   tests.

## Tests

1. Add or update tests under `packages/server/tests/` for new routes, response
   shapes, health/readiness behavior, server config, and error handling.
2. Run package-level checks when server behavior changes:
   - `bun run --filter adhdai-server check`
   - `bun run --filter adhdai-server typecheck`
   - `bun run --filter adhdai-server test`
