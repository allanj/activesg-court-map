# ActiveSG Court Map - Chrome Extension

A Chrome extension that shows a rough location map for each badminton court on the [ActiveSG facility bookings page](https://activesg.gov.sg/facility-bookings/activities/YLONatwvqJfikKOmB5N9U/venues), so you can quickly see where each venue is located before booking.

## Features

- **Inline map buttons** next to each venue name on the ActiveSG booking page
- **Popup maps** showing the exact location using OpenStreetMap
- **Google Maps links** to open directions in a new tab
- **Overview map** (click the extension icon) showing all 100+ badminton venues across Singapore
- **Search** to quickly find a specific venue on the overview map
- Works on both `activesg.gov.sg/facility-bookings/` and `activesg.gov.sg/activities/` pages

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `activesg-court-map` folder
6. The extension is now active — navigate to the ActiveSG venue page to see it in action

## How It Works

- When you visit the ActiveSG badminton venue selection page, the extension scans for venue names
- A small **Map** button appears next to each recognized venue
- Click the button to see a popup map showing the venue's location
- Click the extension icon in the toolbar to see an overview map of all venues
- Use the search bar in the popup to filter and zoom to specific venues

## Venue Database

The extension includes a pre-built database of ~100 ActiveSG badminton venues with their coordinates, including:

- Sport Centres (Bishan, Clementi, Hougang, Jurong East, etc.)
- School Sport Halls (Dual-Use Scheme facilities)

Coordinates are sourced from the official ActiveSG Circle website and Singapore's data.gov.sg open data portal.

## Privacy

- No data is collected or transmitted to any server
- Maps are loaded from OpenStreetMap (open source)
- The extension only runs on ActiveSG pages

## Development

The extension is built with vanilla JavaScript and uses:

- Chrome Manifest V3
- OpenStreetMap for map tiles
- Leaflet.js for the popup overview map

