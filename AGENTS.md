# AGENTS.md

Guide for AI agents (and people) working in this repository. This file is the source of truth: `CLAUDE.md` only points here.

## Stack

- React 19 + TypeScript, with Vite for the build and the dev server.
- React Router for routing and Keycloak (`keycloak-js`) for authentication.
- Vitest + Testing Library (jsdom) for tests, with v8 coverage.
- ESLint for linting. The project uses npm: `package-lock.json` is the only lockfile.
- Plain CSS with the tokens in `src/styles/tokens.css`.

## Before you start

- If the current branch is not `develop`, bring in the changes from `develop` first (`git fetch` and merge `origin/develop`) before touching any code.
- Follow [CONTRIBUTING.md](CONTRIBUTING.md): branch names, PR flow into `develop`, commit format (`SCRUM-XX | Description`) and the PR template.

## Language

- Documentation written for pull requests and commits (PR titles and descriptions, commit messages) is in **English**.
- Everything else (UI text, code comments, docs, conversation) can be in Spanish.

## Quality

- Before handing off, `npm run lint`, `npm run test:coverage` and `npm run build` must pass.
- Unit test coverage must be **above 80%**. New code ships with its tests.

## Backend endpoints (mandatory)

Every endpoint is grouped by module, and its path starts with the name of the module its controller belongs to:

```
/api/v1/{module}/{resource}
```

For example, if the controller lives in the `planner` module, projects are fetched with `GET /api/v1/planner/projects`.

These are the only allowed modules:

| Module          |
|-----------------|
| `planner`       |
| `history`       |
| `insights`      |
| `reports`       |
| `export`        |
| `access`        |
| `notifications` |

**Do not create new modules.** If an endpoint does not fit any of them, ask before inventing one.

In the code:

- Every backend call goes through `apiFetch(module, path, init)` in `src/services/api.ts`. The first argument is the module, and TypeScript only accepts the ones in the list (`API_MODULES`).
- `path` is the route inside the module, without repeating `/api/v1` or the module: `apiFetch('planner', '/projects')`.
- Do not call the backend with `fetch` directly and do not hardcode hosts. The proxy sets the host (Vite in development, `vercel.json` in production).

Current endpoints in the `planner` module:

- `GET /planner/projects`, `POST /planner/projects`
- `GET /planner/clients`, `POST /planner/clients`, `GET /planner/clients/{id}/projects`
- `POST /planner/resources`, `GET /planner/resources/{id}`, `GET /planner/resources/npd-leads`
- `GET /planner/catalogs/{list}` (job-titles, positions, business-units, work-modes, genders, talent-reviews, client-roles, equipment, termination-reasons, statuses)
