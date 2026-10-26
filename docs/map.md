# The map

The map is built with [MapLibre](https://maplibre.org) (SCRUM-99). It is based on the third HTML
prototype (`maplibre-prototype-v3.html`), which was tested with the client first.

## What the user can do

**On Home** (`RoutePlanner.tsx`):

1. Tap the map where you start, or tap **My location**.
2. Tap where you want to go. The app finds up to three walking routes and counts the registered
   street lights along each one.
3. A list shows the routes, the one with the most street lights first, labelled **Most street
   lights** and **Fastest**. Choosing a route closes the list and leaves a short bar with
   **Other routes**.
4. Press and hold the map (right-click on a laptop) to report a **broken street light**. The app
   looks up the nearest light in the register, so one tap reports it.

**During a walk** (`WalkMap.tsx`): the map shows the route that was on the Home map when the walk
started, with the destination pin, and the user's position. Press and hold reports a broken light
in the same way. There is no route planner during a walk; a walk started without a route shows the
map without one.

The street lights themselves are not drawn on the map; they only count for the routes. Only lights
someone reported as broken are drawn, with a red icon. Tapping one shows when it was reported and a
button **It works again**.

## How a route is scored

Code: `lamps.ts`, `routeChoice.ts`, `geometry.ts`.

- A street light counts for a route when it stands within **5 m** of it. _Assumption:_ a wider
  reach also counted lamps on a busy road next to the walking route; with 3 m most lamps on normal
  streets dropped out, because a route often follows the middle of the road.
- Two lamps at exactly the same spot (the register has some) count once.
- A light reported as broken does not count.
- Per route the app shows the number of lights, the lights per km and the **longest gap between
  lights**, from the start, between lamps and to the end.
- **Most street lights** is the route with the most lights per km; on a tie, the shortest gap.

The register says where lamps stand, not whether they are on. The app says "registered street
lights" and never that a light is on.

## Outside services

| Service                                        | What for                                                  | Notes                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| data.eindhoven.nl, `data-openbare-verlichting` | The register of street lights                             | Asked per route, in rectangles of about 250 m along it                                     |
| routing.openstreetmap.de (FOSSGIS)             | Walking routes, plus one cycle route                      | Free demo service, no key. A real app needs its own or a paid one                          |
| tiles.openfreemap.org                          | The base map (the "liberty" style, on OpenStreetMap data) | Free, no key. A raster and a dark style were tried in the prototypes; this one looked best |

The cycle route is offered because it often follows bigger, better lit roads. Its walking time is
worked out at 5 km/h (_Assumption_).

Every request gives up after 12 seconds and is tried once more (`fetchJson.ts`): the municipality's
services sometimes do not answer for half a minute.

## Broken-light reports

Reports are saved in the `reports` table in Supabase (SCRUM-92), so every signed-in user sees the
same broken lights. `brokenLights.ts` loads them when the map opens and saves a new report or "It
works again" straight away. A light can be reported once; anyone can say it works again. A report
disappears by itself after 30 days. See "Reports" in [backend.md](backend.md).

If the reports cannot be loaded, the map and the routes still work, counting every light as
working. If a report or "It works again" cannot be saved, the user sees "Could not save this".

Reports that testers made before SCRUM-92 were kept on their own phone (`localStorage`) and are not
moved to the table.

## Privacy

- The user's position is drawn on the map and used as the start of a route. To plan a route, the
  start and the destination are sent to the FOSSGIS route planner. Nothing else about the user is
  sent, and the map does not store the position. This is written down in
  [backend.md](backend.md) as well.
- The route of a running walk is kept on the phone (`walkRoute.ts`), so the walk screen can show it
  after the app was closed. It includes the start, which is often where the user was. It is erased
  when the user leaves the "You're home" screen. A walk that is never checked in keeps it
  until the next walk replaces it.
- A broken-light report holds the lamp's number, spot and street, and the time of the report.
  Other users never see who reported it, and the spot is the lamp's, not where the user was.

## Testing

MapLibre needs a real browser with WebGL, so the tests replace the map with a stand-in
(`RoutePlanner.test.tsx`) and test the logic on its own (`lamps.test.ts`, `routes.test.ts`,
`geometry.test.ts`, …). Check the map itself in the browser and on a phone.
