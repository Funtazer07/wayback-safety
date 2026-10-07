# Check-in preview: the walk screen without a backend

The "I'm home" button and the "You arrived safely!" message are part of the real app (SCRUM-47
for the design, SCRUM-48 for the build). How the check-in works is described in
[backend.md](backend.md#checking-in).

This preview shows the same walk screen with a 20-minute example walk, without logging in and
without Supabase. Use it to show the check-in in a user test (SCRUM-49).

Run it:

```
npx vite --config check-in-preview.config.ts --host 0.0.0.0 --port 5180
```

Open the printed Network address with `/check-in-preview.html` on a phone on the same Wi-Fi. The
normal `npm run dev` still opens the real app.

What is different from the real app:

- Nothing is written to Supabase. Tapping "I'm home" only changes the example walk on the screen.
- No location is read automatically or sent anywhere, so the screen says that location is off.
  The "My location" control on the map only draws a location on the map.
- Closing the message starts a new example walk, so the demo can be shown again.

The preview config swaps the location hook and the map wrapper, only in this separate build.

Build the preview:

```
npx vite build --config check-in-preview.config.ts
```
