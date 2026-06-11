#!/usr/bin/env node
//
// Run:  node validate.js
//
// Guards against data drift between the canonical venue list, the
// generated geocode cache, and the popup venue database. Exits non-zero
// (for CI) when it finds a problem.
//

const fs = require("fs");
const { VENUE_NAMES } = require("./venue-names.js");

// Singapore bounding box (generous), used to catch bogus coordinates.
const SG = { latMin: 1.15, latMax: 1.50, lngMin: 103.5, lngMax: 104.1 };

// geocache.js / venues.js declare top-level `const`s rather than exporting,
// so evaluate each file in an isolated scope and return the binding.
function loadGlobal(file, varName) {
  const src = fs.readFileSync(file, "utf8");
  return new Function(`${src}\nreturn ${varName};`)();
}

const errors = [];
const inSg = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= SG.latMin && lat <= SG.latMax &&
  lng >= SG.lngMin && lng <= SG.lngMax;

// 1. No duplicate names in the canonical list.
const seen = new Set();
for (const name of VENUE_NAMES) {
  const key = name.toLowerCase();
  if (seen.has(key)) errors.push(`Duplicate venue name: "${name}"`);
  seen.add(key);
}

// 2. Every canonical name has a geocache entry with sane coordinates.
const GEOCACHE = loadGlobal("geocache.js", "GEOCACHE");
for (const name of VENUE_NAMES) {
  const entry = GEOCACHE[name.toLowerCase()];
  if (!entry) {
    errors.push(`Missing geocache entry for "${name}" — rerun build-geocache.js`);
  } else if (!inSg(entry.lat, entry.lng)) {
    errors.push(`geocache "${name}" has out-of-Singapore coords (${entry.lat}, ${entry.lng})`);
  }
}

// 3. Popup database coordinates are sane (it is curated by hand).
const VENUE_DATABASE = loadGlobal("venues.js", "VENUE_DATABASE");
for (const [name, data] of Object.entries(VENUE_DATABASE)) {
  if (!inSg(data.lat, data.lng)) {
    errors.push(`venues.js "${name}" has out-of-Singapore coords (${data.lat}, ${data.lng})`);
  }
}

const geocacheCount = Object.keys(GEOCACHE).length;
const popupCount = Object.keys(VENUE_DATABASE).length;

if (errors.length) {
  console.error("Validation FAILED:\n  - " + errors.join("\n  - "));
  process.exit(1);
}

console.log(
  `Validation OK — ${VENUE_NAMES.length} canonical names, ` +
  `${geocacheCount} geocache entries, ${popupCount} popup venues.`
);
