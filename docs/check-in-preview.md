# SCRUM-47: I'm home visual prototype

This preview adds the button and confirmation from the user's Figma screenshot to the existing
walk screen. The map, round timer, walk panel, app and backend files are unchanged.

Run the separate preview:

```
npx vite --config check-in-preview.config.ts --host 0.0.0.0 --port 5180
```

Open the printed Network address with `/check-in-preview.html` on a phone on the same Wi-Fi,
or use the separately hosted preview link. The normal `npm run dev` still opens the original app.

This is a visual prototype, not a completed safety feature. It uses a 20-minute example walk.
Tapping I'm home freezes only the demo clock and opens a confirmation. Its SMS message is explicitly
labelled as simulated. Nothing is written to Supabase and no SMS is sent. The optional My location
map control only draws a location in the existing map; no location is shared with contacts or stored.
The normal app does not acquire a pretend check-in button.

The preview config swaps the location hook, clock hook and map wrapper only in this separate build.
The existing map is used without an automatic location watch. All additions are isolated files.
Real server check-in and contact notifications need their separate SCRUM implementation.

Build the preview:

```
npx vite build --config check-in-preview.config.ts
```

Requirements and layout follow the user's story and screenshot. Jira comments were unavailable.
