# Contributing

New to coding? Start with [docs/getting-started.md](docs/getting-started.md). Examples of how we
write components, tests and styles are in [docs/code-patterns.md](docs/code-patterns.md).

## Branches and merge requests

- `main` is always deployable. Do not push to it directly; open a merge request.
- One branch per Jira subtask, named after its key: `SCRUM-38-backend-and-login`.
- Start commit messages and merge request titles with the key: `SCRUM-38: backend and login`.
- Keep merge requests small. One teammate reviews before merge.
- The pipeline (lint, format, type-check, tests, build) must pass before merge. Run `npm run check`
  locally first.

## Folder structure

```
src/
  main.tsx          app entry
  App.tsx           root component
  features/         one folder per feature: auth, onboarding, walk, map
  components/       UI components shared between features
  lib/              shared helpers and service clients (no React components)
```

Create a folder when the first file for it is added. A feature folder holds its own components,
hooks and tests. Code used by one feature stays in that feature.

## Code rules

- Code, comments and docs are in English. User-facing text will be in Dutch and English.
- TypeScript everywhere; no `any` unless there is a comment explaining why.
- Function components and hooks. One component per file, file named after the component.
- Tests live next to the code as `Name.test.tsx`. New logic comes with a test.
- Formatting is done by Prettier, linting by oxlint. Do not argue about style in reviews; change the
  config instead.
- If something is an assumption, say so in a comment or the docs instead of presenting it as fact.
- Distances are in km. Example data uses real Eindhoven street names.

## Privacy and security

The app handles live location and home addresses.

- No secrets in the repository. Real keys go in `.env.local` (ignored by git); document new
  variables in `.env.example`.
- Store the minimum location data for the shortest time, and write the decision down in the merge
  request or docs.
- The municipal lamp data is a register, not a live status. Never present it as "light is on".
