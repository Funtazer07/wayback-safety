# The map

The map is built with [MapLibre](https://maplibre.org) (SCRUM-99). It is based on the third HTML
prototype (`maplibre-prototype-v3.html`), which was tested with the client first.

## What the user can do

**On Home** (`RoutePlanner.tsx`):

1. Tap the map where you start, or tap **My location**.
2. Type where you want to go in the search bar ("Where are you going?") and pick a result, or press
   Enter for the first one. Tapping the map still works too, for a spot without an address. A place
   searched before the start is known is planned as soon as there is a start. Under the search bar,
   **Home** plans the walk home in one tap. The first time it says **Set home**: the user searches
   their address once and it is saved on this phone (see Privacy). The app finds up to three
   walking routes and counts the registered street lights along each one.

   The place chosen here is also the walk's destination ("Walking to …" on the walk screen and for
   the contacts): "Home", the address from the search bar, or "Your pin on the map". The "Set your
   check-in" screen no longer has its own place picker. A route that runs for more than 70% along one already shown is
   left out (`routes.ts`), because testers saw routes that differ in a street or two as no real
   choice (_Assumption:_ 70%, to check again with users). So sometimes only one or two routes are
   shown.

3. A list shows the routes, the one with the most street lights first, labelled **Most street
   lights** and **Fastest**. Choosing a route closes the list and leaves a short bar with
   **Other routes**.
4. Press and hold the map (right-click on a laptop) to report a **broken street light**. The app
   looks up the nearest light in the register, so one tap reports it.

**During a walk** (`WalkMap.tsx`): the map shows the route that was on the Home map when the walk
started, with the destination pin, and the user's position. Press and hold reports a broken light
in the same way. There is no route planner during a walk; a walk started without a route shows the
map without one.

The walk screen is kept calm, like a navigation app: the map takes most of the screen, and the
panel under it shows the timer, the destination and **I'm home**. Extra time and Cancel walk are
behind **More time or cancel**, except in the last 5 minutes. The red **Report** button on the map
opens the report form for the spot where the user is (SCRUM-96, see "Place reports" below).

The street lights themselves are not drawn on the map; they only count for the routes. Only lights
someone reported as broken are drawn, with a red icon. Tapping one shows when it was reported and a
button **It works again**.

The map credits ("i") sit bottom left and are closed when the map opens. They cannot be removed:
the licence of the OpenStreetMap data asks for them to be on the map.

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
| OpenRouteService (HeiGIT), via `plan-route`    | Walking routes, plus one cycle route                      | Free plan with a key. Asked by our Edge Function, never by the phone; see backend.md       |
| tiles.openfreemap.org                          | The base map (the "liberty" style, on OpenStreetMap data) | Free, no key. A raster and a dark style were tried in the prototypes; this one looked best |
| api.pdok.nl, Locatieserver (Kadaster)          | The search bar: addresses, streets and postcodes          | Free, no key, made for search-as-you-type. Only places in Eindhoven are asked for          |

The search waits until the user stops typing for 300 ms (_Assumption_), so it does not send a
request for every key. Shops and cafés cannot be found: the register holds addresses only.

The cycle route is offered because it often follows bigger, better lit roads. Its walking time is
worked out at 5 km/h (_Assumption_).

Every request for lamps gives up after 12 seconds and is tried once more (`fetchJson.ts`): the
municipality's services sometimes do not answer for half a minute. A route request is not tried
again; `plan-route` gives each OpenRouteService request 12 seconds itself.

## Broken-light reports

Reports are saved in the `reports` table in Supabase (SCRUM-92), so every signed-in user sees the
same broken lights. `brokenLights.ts` loads them when the map opens and saves a new report or "It
works again" straight away. A light can be reported once; anyone can say it works again. A report
disappears by itself after 30 days. See "Reports" in [backend.md](backend.md).

If the reports cannot be loaded, the map and the routes still work, counting every light as
working. If a report or "It works again" cannot be saved, the user sees "Could not save this".

Reports that testers made before SCRUM-92 were kept on their own phone (`localStorage`) and are not
moved to the table.

## Place reports

Made with the **Report** button during a walk (`src/features/reports/`): one of four categories
(broken or flickering light, dark or unlit area, suspicious or unsafe situation, other hazard) and
an optional note. Decided on 4 Nov: they are shown on both maps (Home and the walk) to every
signed-in user, earlier than SCRUM-8 planned (it waited for SCRUM-10).

On the map each report is a round icon in the colour of its category, with its own picture, inside
a soft circle of about 60 m. The circle is there because the spot is rounded: it shows the area,
not where the reporter stood. Tapping the icon shows the category and when it was reported. The
note and who reported it are never shown. A new report appears on the map as soon as it is saved.

## Privacy

- The user's position is drawn on the map and used as the start of a route. To plan a route, the
  start and the destination are sent to our `plan-route` Edge Function, which asks
  OpenRouteService. Nothing else about the user is sent, and neither the map nor the function
  stores the position. This is written down in [backend.md](backend.md) as well.
- What the user types in the search bar goes straight from the phone to PDOK, without anything
  about the user. PDOK does see the phone's internet address, like every website does.
- The saved home (address and spot) is kept on this phone only (`savedHome.ts`, `localStorage`) and
  never sent to our server. Decided on 11 Nov: a home address is too personal for the shared
  database, and the app only needs it on the phone. On a new phone the user sets it again. **Change
  home → Remove saved home** deletes it. A walk home sends only the word "Home" as its destination.
- The route of a running walk is kept on the phone (`walkRoute.ts`), so the walk screen can show it
  after the app was closed. It includes the start, which is often where the user was. It is erased
  when the user leaves the "You're home" screen. A walk that is never checked in keeps it
  until the next walk replaces it.
- The same route, without the walking time, is also sent to the server when the walk starts, so the
  walk's contacts see it while the walk is on the way (`share_walk_route`, see "The contact's view"
  in [backend.md](backend.md)). The server erases it when the walk ends or becomes overdue.
- A broken-light report holds the lamp's number, spot and street, and the time of the report.
  Other users never see who reported it, and the spot is the lamp's, not where the user was.

## Testing

MapLibre needs a real browser with WebGL, so the tests replace the map with a stand-in
(`RoutePlanner.test.tsx`) and test the logic on its own (`lamps.test.ts`, `routes.test.ts`,
`geometry.test.ts`, …). Check the map itself in the browser and on a phone.
