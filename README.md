# WayBack Safety

A walking-home safety app for people in Eindhoven at night. Users start a timed walk home; if they
do not check in on time, their trusted contacts are alerted. A map shows street lighting from the
Municipality of Eindhoven's open data.

Group student project (Fontys ICT) for the Studio Krom open call "Who owns the night?".

Requirements and sprint scope live in Jira (project key `SCRUM`). If this README and Jira disagree,
Jira wins.

## Tech stack

- Vite + React + TypeScript
- Vitest + Testing Library for tests
- oxlint for linting, Prettier for formatting
- GitLab CI for checks on every merge request

Planned in later subtasks: PWA setup with vite-plugin-pwa (SCRUM-37), Supabase for login and
database (SCRUM-38), MapLibre with OpenStreetMap tiles (SCRUM-54).

## Getting started

Requires Node.js 22 or newer (24 recommended, see `.nvmrc`).

```
npm install
npm run dev
```

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the dev server                          |
| `npm run build`   | Type-check and build for production           |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Lint with oxlint                              |
| `npm run format`  | Format all files with Prettier                |
| `npm run test`    | Run the tests once                            |
| `npm run check`   | Lint, format check, type-check and tests (CI) |

## Contributing

- [docs/getting-started.md](docs/getting-started.md): step-by-step guide if you are new to coding
- [docs/code-patterns.md](docs/code-patterns.md): how we write components, tests and styles, with
  examples
- [CONTRIBUTING.md](CONTRIBUTING.md): folder structure, branch rules and code rules
