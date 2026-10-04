# Deployment

The team works on GitHub. The Fontys GitLab (`git.fhict.nl`) has no CI runners and no Pages, so it
cannot run our checks or host the app. It only receives a copy of the code.

```
pull request on GitHub  ->  checks run  ->  merge to main  ->  app is deployed to GitHub Pages
                                                           ->  main is copied to the Fontys GitLab
```

- **GitHub** is the only place you push to and open pull requests.
- **GitHub Pages** hosts the static files at <https://funtazer07.github.io/wayback-safety/>. The backend
  (Supabase, SCRUM-38) is hosted separately.
- **Fontys GitLab** is a read-only copy of `main`, so teachers can follow the work there. Never
  push or edit there; the next copy would fail. Pull requests and reviews exist only on GitHub.

The GitHub repository is public, because GitHub Pages on a free account requires that. Anyone can
read the code, so the "no secrets in the repository" rule matters even more.

## Where to see results

- Checks (lint, format, type-check, tests, build) appear at the bottom of each pull request.
- After a merge, the **Actions** tab shows three jobs for `main`: `check`, `deploy` and
  `copy-to-fontys-gitlab`.

## One-time setup

Done once by the owner of the GitHub repository.

### 1. Turn on Pages

In the GitHub repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.

### 2. Protect main

In the GitHub repository: **Settings > Rules > Rulesets > New branch ruleset** for the default
branch. Turn on "Require a pull request before merging" and "Require status checks to pass", and
add the `check` job as a required check. Now nobody can merge red code by accident.

### 3. Token for the copy to the Fontys GitLab

In the Fontys GitLab project: **Settings > Access tokens > Add new token**, with role
**Maintainer** and scope **write_repository**. If that page is not available, use a personal access
token instead (**your avatar > Preferences > Access tokens**) with the same scope.

In the GitHub repository: **Settings > Secrets and variables > Actions > New repository secret**,
named `FONTYS_GITLAB_TOKEN`, with the token as its value.

The token is a secret. Never put it in the code, a commit or the group chat. It expires; when the
copy job starts failing, a new token is the first thing to check.

### 4. Add the team

In the GitHub repository: **Settings > Collaborators > Add people**.

## The subfolder path

The site is served from `/<repository>/`, not from the root. The deploy job passes that path to the
build as `BASE_PATH`, and `vite.config.ts` uses it for all file links and for the PWA manifest.

In code, never write a path that starts with `/` by hand (for example `<img src="/logo.svg">`).
Import the file, or build the path with `import.meta.env.BASE_URL`.

If the GitHub repository is renamed, the URL changes and installed copies of the app stop working.

## If something fails

| Problem                               | Likely cause                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Checks are red                        | Click **Details** next to the red check and read the failing step                  |
| Deploy job fails at "configure-pages" | Pages is not turned on, or its source is not "GitHub Actions" (step 1)             |
| Copy job fails with "Access denied"   | `FONTYS_GITLAB_TOKEN` is missing, expired, or lacks the Maintainer role (step 3)   |
| Copy job fails with "rejected"        | Someone changed the Fontys GitLab repository directly; it no longer matches GitHub |
| Site loads but is blank               | A hand-written path starting with `/`; see "The subfolder path"                    |
