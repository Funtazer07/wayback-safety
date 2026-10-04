# Deployment

The app is hosted on Netlify as static files. Every push to `main` runs the GitLab pipeline; when
lint, tests and build pass, the `deploy` job uploads the `dist/` folder to Netlify.

Netlify cannot connect to the Fontys GitLab directly, so the site is not linked to a Git repository
in Netlify. GitLab pushes the files to Netlify instead.

The backend (Supabase, SCRUM-38) is hosted separately and is not part of this deployment.

## One-time setup

Done once by whoever owns the Netlify account.

1. In Netlify, create a site without Git: **Add new project > Deploy manually**, and drop in any
   folder (for example `dist/` after running `npm run build`). This only creates the site; the
   pipeline replaces its content later.
2. Copy the **Project ID** from **Project configuration > General > Project details**.
3. Create a token: **User settings > Applications > Personal access tokens > New access token**.
4. In GitLab, open **Settings > CI/CD > Variables** and add:

   | Key                  | Value          | Options                      |
   | -------------------- | -------------- | ---------------------------- |
   | `NETLIFY_SITE_ID`    | the Project ID | Protected                    |
   | `NETLIFY_AUTH_TOKEN` | the token      | Protected, Masked and hidden |

5. Push to `main` (merge a merge request). The `deploy` job should turn green and the site updates.

The token gives full access to the Netlify account. Never put it in the code, a commit or the group
chat.

## Changing the site name

The public URL is `https://<site-name>.netlify.app`. Change the name in Netlify under
**Project configuration > General > Project details > Change project name**.

## If the deploy job fails

| Message in the job log           | Cause                                                     |
| -------------------------------- | --------------------------------------------------------- |
| `Unauthorized` / `Not logged in` | `NETLIFY_AUTH_TOKEN` is missing, wrong or expired         |
| `Project not found`              | `NETLIFY_SITE_ID` is missing or wrong                     |
| Variables seem empty             | They are "Protected" but `main` is not a protected branch |
