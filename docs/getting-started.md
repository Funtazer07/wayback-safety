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
   git clone https://git.fhict.nl/I533293/waybacksafety.git
   cd waybacksafety
   npm install
   ```

5. Open the `waybacksafety` folder in VS Code. It will ask "Do you want to install the recommended
   extensions?" Click **Install**. After this, your code is tidied up automatically every time you
   save a file.

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

This runs the same checks GitLab runs. If it ends without red errors, you are good. If it complains
about formatting, run `npm run format` and try again.

### 6. Save and upload your change

```
git add .
git commit -m "SCRUM-39: add welcome screen"
git push -u origin SCRUM-39-onboarding-screens
```

The commit message starts with the Jira key and says what you did, in a few words.

### 7. Open a merge request

Git prints a link after `git push`. Open it, fill in the template, and ask a teammate to review.
When the checks are green and a teammate approved, click **Merge**.

## When something goes wrong

| What you see                      | What to do                                                  |
| --------------------------------- | ----------------------------------------------------------- |
| `npm: command not found`          | Node.js is not installed, or restart the terminal           |
| Errors right after `git pull`     | Run `npm install` again; someone added a package            |
| `npm run check` fails on "format" | Run `npm run format`                                        |
| Red underline in VS Code          | Hover over it and read the message; it usually says the fix |
| "Merge conflict"                  | Stop and ask a teammate. Do not guess                       |
| The pipeline on GitLab is red     | Click it, open the red job, read the last lines             |
| Anything else                     | Copy the full error message into the group chat             |

Never paste passwords or keys into the code or the group chat. See "Privacy and security" in
[CONTRIBUTING.md](../CONTRIBUTING.md).
