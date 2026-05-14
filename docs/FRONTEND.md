# Frontend

The web package contains the Next.js operator UI in `packages/web`.

Operator surfaces include the web UI, CLI output, Linear comments, and GitHub PR metadata. Document frontend changes with:

1. user workflows and personas
2. API boundaries
3. reliability and auth model
4. deployment and rollback strategy

## Local Commands (Workspace Scripts)

- `bun run dev`: start the local API server on port 3001 and web UI on port 3002
- `bun run dev:web`: start only the web package dev server
- `bun run dev:server`: start only the API server on `PIV_SERVER_PORT=3001`
- `bun run build:web`: reserved workspace web build command
- `bun run build:server`: reserved workspace API server build command

The combined `dev` entrypoint delegates to the package-specific scripts, so use it as the default local startup command.
