# Chrome Web Store Listing Guide

Ready-to-paste copy and an asset checklist for publishing **ActiveSG Court Map**.
Keep this in sync with `manifest.json` (name, version, permissions) and `PRIVACY.md`.

## Listing metadata

- **Name:** ActiveSG Court Map
- **Summary (≤132 chars):** Map ActiveSG badminton venues by location. See where each court is, filter by region, and find the nearest court to you.
- **Category:** Sports (alternate: Productivity)
- **Language:** English

## Detailed description

> Pick an ActiveSG badminton court by *where it is*, not just by name.
>
> ActiveSG Court Map adds map tools to the ActiveSG booking flow so you can see
> exactly where each listed venue is before you book.
>
> Features
> • Map sidebar on ActiveSG venue pages — see every venue on the page at a glance.
> • Popup directory of all known badminton venues across Singapore.
> • Filter venues by type (sport centre vs school hall) and by region.
> • "Near me" / "Nearest" — sort venues by distance after you share your location.
> • One-tap Google Maps links for route planning.
>
> Privacy first
> • No analytics, no trackers, no private server.
> • Runs only on activesg.gov.sg.
> • Location is requested only when you tap Near me / Nearest, and is never stored or sent anywhere.
>
> Maps © OpenStreetMap contributors. Not affiliated with ActiveSG or SportSG.

## Single-purpose statement (required)

> The extension's single purpose is to show the geographic location of badminton
> venues listed on ActiveSG booking pages and help users compare them by distance.

## Permission justifications (required at submission)

| Permission | Justification |
| --- | --- |
| `geolocation` | Only when the user clicks Near me / Nearest, to sort venues by distance to the user. Location is not stored or transmitted. |
| `storage` | Caches OneMap geocode results locally so the extension does not repeat the same lookups on each page load. |
| Host: `onemap.gov.sg` | Geocode fallback for venues that are not in the bundled cache. |
| Content script on `activesg.gov.sg` | Reads visible venue names on booking pages to place them on the map. |

## Data-usage disclosures (Privacy tab)

- Does the item collect or use **location**? **Yes** — "Used only on user action to sort venues by distance; not stored or sold."
- All other data categories: **No**.
- Certify: not sold to third parties; not used for unrelated purposes; not used for creditworthiness.
- Privacy policy URL: link to the hosted `PRIVACY.md`.

## Asset checklist

Chrome Web Store requirements — the current `docs/images/*.png` are 380×520
(popup-only) and **do not meet** the screenshot size spec; recapture before submitting.

- [ ] **Icon** 128×128 (have it; confirm it is crisp, not upscaled).
- [ ] **Screenshots** 1280×800 **or** 640×400 PNG/JPEG — at least 3, ideally 5:
  1. Sidebar open on a real ActiveSG booking page (the core feature).
  2. Popup directory with type/region filter chips visible.
  3. Popup "Near me" active, showing distance badges.
  4. Overview map tab with markers across Singapore.
  5. A venue's Google Maps hand-off.
- [ ] **Small promo tile** 440×280 (used in store search/category pages).
- [ ] **Marquee promo** 1400×560 (optional, for featured placement).

Tip: capture screenshots from the installed unpacked extension at the real
1280×800 canvas (pad the 380px popup on a branded background) so reviewers see
the actual UI.

## Pre-submit checklist

- [ ] `manifest.json` name, description, version, icons correct.
- [ ] `sh check.sh` passes.
- [ ] Manual pass: popup filters, Near me, sidebar, Nearest, Google Maps links.
- [ ] `PRIVACY.md` hosted at a public URL and matches declared permissions.
- [ ] ZIP has files at the root (no extra parent folder).
