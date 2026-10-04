# Getting started (for everyone in the group)

This guide assumes you have never worked on a code project before. Follow it top to bottom once;
after that you only need the "Every time you work" part.

## One-time setup

1. Install [Node.js](https://nodejs.org) (the LTS version). This is what runs the project on your
   laptop.
2. Install [Git](https://git-scm.com/downloads). This is what keeps track of everyone's changes.
3. Install [Visual Studio Code](https://code.visualstudio.com). This is the editor.
4. Get the project onto your laptop. Open a terminal and run:

   ```
   git clone https://github.com/Funtazer07/wayback-safety.git
   cd wayback-safety
   npm install
   ```

5. Open the `wayback-safety` folder in VS Code. It will ask "Do you want to install the recommended
   extensions?" Click **Install**. After this, your code is tidied up automatically every time you
   save a file.
6. Connect the app to the backend (login and database). Without this step the app only shows "The
   backend is not set up yet".
   1. In VS Code, find the file `.env.example` in the list on the left.
   2. Right-click it and choose **Copy**, then right-click an empty spot in the list and choose
      **Paste**. You now have a file called `.env copy.example`.
   3. Right-click the copy, choose **Rename**, and name it exactly `.env.local`.
   4. Open `.env.local`. If the line `VITE_SUPABASE_PUBLISHABLE_KEY=` has nothing after the `=`,
      ask the teammate who set up Supabase for the publishable key and paste it there, with no
      spaces. Save the file.
   5. You only do this once. The file stays on your laptop and is never uploaded.
   6. To check it worked: run `npm run dev` and open the link. You should see the "Sign up" screen.

## Every time you work

### 1. Get the latest version

```
git checkout main
git pull
```

### 2. Make a branch for your Jira subtask

A branch is your own copy to work in, so you cannot break anything for the others. Name it after
the Jira key:

```
git checkout -b SCRUM-39-onboarding-screens
```

### 3. Start the app

```
npm run dev
```

Open the link it prints (usually http://localhost:5173). The page updates by itself when you save a
file. Stop it with `Ctrl + C`.

To see it as a phone: in Chrome press `F12`, then click the phone icon at the top left of the panel.

### 4. Make your change

See [code-patterns.md](code-patterns.md) for where files go and how to write them. Copy an existing
file that does something similar and change it; that is faster and safer than starting from zero.

### 5. Check your work

```
npm run check
```

This runs the same checks that run automatically after you push. If it ends without red errors, you are good. If it complains
about formatting, run `npm run format` and try again.

### 6. Save and upload your change

```
git add .
git commit -m "SCRUM-39: add welcome screen"
git push -u origin SCRUM-39-onboarding-screens
```

The commit message starts with the Jira key and says what you did, in a few words.

### 7. Open a pull request

Git prints a link after `git push`. Open it, fill in the template, and ask a teammate to review.
The checks appear at the bottom of the pull request after a minute or two. When they are green and
a teammate approved, click **Merge**.

## When something goes wrong

| What you see                           | What to do                                                      |
| -------------------------------------- | --------------------------------------------------------------- |
| `npm: command not found`               | Node.js is not installed, or restart the terminal               |
| Errors right after `git pull`          | Run `npm install` again; someone added a package                |
| `npm run check` fails on "format"      | Run `npm run format`                                            |
| Red underline in VS Code               | Hover over it and read the message; it usually says the fix     |
| "Merge conflict"                       | Stop and ask a teammate. Do not guess                           |
| The checks on the pull request are red | Click **Details** next to the red one and read the failing step |
| Anything else                          | Copy the full error message into the group chat                 |

Never paste passwords or keys into the code or the group chat. See "Privacy and security" in
[CONTRIBUTING.md](../CONTRIBUTING.md).
