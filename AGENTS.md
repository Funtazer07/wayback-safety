# Guide for AI agents

How to work in this repository as an AI coding agent. The human docs stay the source for details;
this file says what to read, what to run, and what not to do.

WayBack Safety is a walking-home safety app (PWA) for Eindhoven at night: a timed walk, a check-in,
and an alert to trusted contacts when the check-in is missed. It is a Fontys ICT group project, and
several teammates are new to coding. Write code, comments and docs so a beginner can follow them.

## Before you start a task

1. Find the Jira subtask (project key `SCRUM`). Jira is the source of truth for requirements and
   sprint scope. If Jira and this repository (code or docs) disagree, do not pick a side yourself:
   stop, show the user both versions, and ask which one is right. Research results are linked from
   subtask comments, so read the comments too.
2. For anything with a screen, get the design from the Figma wireframe before asking how it should
   look. If a design seems to be missing, ask for the link.
3. Read the doc that covers the area you will touch:

| Doc                                            | Read it when you                                    |
| ---------------------------------------------- | --------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)             | need the folder structure, branch or code rules     |
| [docs/code-patterns.md](docs/code-patterns.md) | write a component, hook, test or CSS                |
| [docs/backend.md](docs/backend.md)             | touch login, the database or anything with Supabase |
| [docs/deployment.md](docs/deployment.md)       | touch CI, the build, paths or the PWA manifest      |

4. Find an existing file that does something similar and follow it. `src/features/walk/` is the
   most complete example of a feature.

## Commands

```
npm run dev      start the dev server (must be http://localhost:5173/ for Google sign-in to return)
npm run check    lint, format check, type-check and tests
npm run build    type-check and production build
npm run format   let Prettier fix the formatting
```

Before you say a task is done, run `npm run check` and `npm run build`. CI runs both and blocks the
merge when either fails. Run one test file with `npx vitest run src/features/walk/walk.test.ts`.

## Ask first

Stop and ask the user before you do any of these:

- **Commit, push or open a pull request.** Leave the changes in the working tree and say they are
  ready. Only write to git history or a remote when the user asks for it in that message.
- **Add a package** (`npm install ...`), or bring in a new kind of tool: routing, state library, UI
  kit, push provider, routing service. The stack below is decided; anything else is a group
  decision.
- **Run SQL against the database**, or change anything in the Supabase, Google Cloud or GitHub
  settings. There is one database, shared by every laptop and the live site.
- **Resolve a conflict between Jira and the repository.** Show both versions and let the user
  decide.
- **Change scope**: build something the subtask does not ask for, or leave out something it does.

Never add AI attribution: no `Co-Authored-By` line in commits and no "Generated with ..." line in
pull requests.

## Stack

Vite, React 19, TypeScript, plain CSS, Vitest with Testing Library, oxlint, Prettier,
vite-plugin-pwa, and Supabase for login and database. MapLibre with OpenStreetMap tiles is planned
(SCRUM-54) but not installed yet. There is no router and no state library.

## How the code is organised

- `src/App.tsx` decides which screen is shown, with a list of early returns: backend missing,
  loading, logged out, error, onboarding, running walk, home. A new top-level screen is a new
  branch there, not a route.
- `src/features/<feature>/` holds everything for one feature. The usual set of files:

  | File             | What goes in it                                                              |
  | ---------------- | ---------------------------------------------------------------------------- |
  | `walk.ts`        | Types and the functions that talk to Supabase. No React                      |
  | `useWalk.ts`     | A hook that loads the data and returns `{ ...data, isLoading, error }`       |
  | `WalkScreen.tsx` | One component, default export, props type right above it                     |
  | `time.ts`        | Plain logic used by the screens, so it can be tested without rendering       |
  | `walk.css`       | The feature's styles, class names prefixed with the feature name (`walk-..`) |
  | `*.test.ts(x)`   | Tests, next to the file they test                                            |

- `src/components/` is for UI used by more than one feature, `src/lib/` for helpers without UI.
  Move code there only when a second feature needs it.

Things the existing code does that are easy to miss:

- Imports include the file extension: `from './walk.ts'`, `from './Home.tsx'`.
- `supabase` from `src/lib/supabase.ts` is `null` when the environment variables are missing. Data
  functions go through a small `client()` helper that throws a clear error instead.
- Database rows are snake_case and are mapped to a camelCase type in one `toX(row)` function per
  feature. Timestamps become `Date` there. Components never see a raw row.
- Data functions throw on error. The hook catches and turns it into a short sentence for the user.
- A hook that loads data guards against a late answer with an `isCurrent` flag (see `useWalk.ts`).
- Global layout classes (`.screen` and the shared button styles) are in `src/index.css`. Check
  there before writing new CSS.
- Never hand-write a path that starts with `/`. The live site runs in a subfolder; import the file
  or use `import.meta.env.BASE_URL`.

## Tests

- New logic comes with a test. Test names are full sentences about behaviour:
  `'starting a walk fails when the server refuses it'`.
- Component tests check what the user sees and find elements by role and name.
- Supabase is always mocked with `vi.mock('../../lib/supabase.ts', ...)`. Use `vi.hoisted` for mock
  functions the test needs to inspect (see `walk.test.ts`). Tests never reach the real backend.
- Browser features are faked with `vi.stubGlobal` and reset in `afterEach` (see `Home.test.tsx`).

## Database changes

- One new numbered file in `supabase/migrations/` per change (`0004_...sql`). Never edit a file
  that is already there: those have been run on the real database.
- Follow `0003_walks.sql`: a header comment with the Jira key and the reasoning, `check`
  constraints on every column that can be wrong, and a comment on each non-obvious line.
- Every new table gets row level security and a policy that limits rows to their owner. The API
  key is public, so RLS is the only protection.
- When the server must stay in control (deadlines, statuses), give the table no write policy and
  add a `security definer` function with `set search_path = ''`, then revoke `execute` from
  `public, anon` and grant it to `authenticated`.
- You write the file; a human runs it in the Supabase SQL Editor after the pull request is merged.
- Update the data model and privacy sections of `docs/backend.md` in the same change.

## Rules that come from what the app is

- **Location data:** store the minimum for the shortest time, and write the decision down in
  `docs/backend.md`. A walk keeps one last location, never a trail.
- **Lamp data:** the municipal dataset says where lamps are, not whether they are on. Never show
  it as "this light is on".
- **Secrets:** the repository is public. Only the Supabase URL and publishable key may appear, and
  only through `.env.local`. Document a new variable in `.env.example`.
- **Assumptions:** when you guess (a limit, a default, a behaviour), mark it with `Assumption:` in
  a comment or the docs, as `0003_walks.sql` does.
- **Phone, at night, one hand:** large text, buttons at least 44 × 44 px, strong contrast, sizes in
  `rem`, real `<button>` and `<label>` elements, never colour alone for meaning.
- **Text:** user-facing text is English for now, written as whole sentences inside the component so
  it can be translated to Dutch later.
- **Example data:** km for distances, real Eindhoven street names, made-up people.

## Writing style

- Comments explain why, in plain words, and name the Jira key of work that is still to come
  (`The check-in button comes here. It is designed and built in SCRUM-47.`).
- Docs use short sentences and no jargon without an explanation. When behaviour changes, update the
  doc that describes it in the same change.
- No `console.log`, no commented-out code, no `any` without a comment saying why.
- Keep components under roughly 100 lines; split a part out when they grow.

## Git

- GitHub (`origin`) is the only remote to push to. The Fontys GitLab (`fontys`) is an automatic
  read-only copy of `main`; pushing there breaks the copy job.
- One branch per Jira subtask: `SCRUM-43-walks-table-and-timer`. Never work on `main` directly.
- Commit messages and pull request titles start with the key: `SCRUM-43: walks table and timer`.
- Pull requests are small and use `.github/pull_request_template.md`.
