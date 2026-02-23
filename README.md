# Prompt-Library

## Runtime
- Required Node version is pinned in `.nvmrc` (`20.19.0`).
- Run `nvm use` before project commands.
- `npm run runtime:check` validates Node (and npm minimum from `package.json#engines`).
- Core scripts (`dev`, `build`, `lint`, `typecheck`, `db:*`, `start`) now run this preflight automatically.
- `npm run setup` runs runtime precheck, validates required `.env.local` keys, and applies DB migrations.
- `npm run seed` upserts baseline local data (admin user + starter prompt/version) for development.
