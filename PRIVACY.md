# Privacy Policy

ActiveSG Court Map is a Chrome extension that helps users view badminton venue locations while using ActiveSG booking pages.

## Data Collection

The extension does not collect, sell, or share personal data.

The extension does not use analytics, advertising trackers, or a private backend server.

## Location Use

The **Nearest** feature (sidebar) and **Near me** feature (popup) ask for browser geolocation only after the user clicks the button and grants permission. The location is used locally to sort venues by distance and to show the user's location marker on the map.

The extension does not store location history and never transmits your location anywhere.

## Local Storage

Successful OneMap geocode lookups are cached on your device via `chrome.storage.local` so the extension does not repeat the same lookups on every page load. This cache holds only venue names and their coordinates — no browsing activity or personal data.

## External Services

The extension uses:

- OpenStreetMap map tiles to display maps.
- OneMap geocoding as a fallback when a visible venue is missing from the bundled geocode cache.
- Google Maps links only when the user clicks an external map link.

## Permissions

The extension runs only on ActiveSG pages listed in `manifest.json`. It does not request broad browsing permissions.

- `geolocation`: used only when you click **Nearest**/**Near me**, to sort venues by distance.
- `storage`: used only to cache geocode results locally (see Local Storage).
- Host access to `onemap.gov.sg`: used only for geocode fallback lookups.

## Contact

For questions or issues, open an issue in this repository.
