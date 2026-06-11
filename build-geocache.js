#!/usr/bin/env node
//
// Run:  node build-geocache.js
//
// Geocodes every known ActiveSG badminton venue name via Nominatim
// and writes geocache.js (loaded by the sidebar for instant lookups).
//

const https = require("https");
const http = require("http");
const fs = require("fs");

// Canonical venue list lives in venue-names.js (shared with validate.js).
const { VENUE_NAMES: VENUES } = require("./venue-names.js");

function queryOneMap(query) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(query);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${q}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (data && data.results && data.results.length > 0) {
              const r = data.results[0];
              resolve({
                lat: parseFloat(r.LATITUDE),
                lng: parseFloat(r.LONGITUDE),
                display: r.ADDRESS || r.SEARCHVAL,
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

function buildQueries(name) {
  const queries = [name];
  const noHall = name.replace(/ Hall$/i, "");
  if (noHall !== name) queries.push(noHall);
  const noSchoolHall = name.replace(/ (Primary |Secondary |High )?School Hall$/i, "");
  if (noSchoolHall !== name && noSchoolHall !== noHall) queries.push(noSchoolHall + " School");
  const noSportHall = name.replace(/ Sport (Hall|Centre)$/i, "");
  if (noSportHall !== name) queries.push(noSportHall + " Sports Hall");
  return queries;
}

async function geocode(name) {
  for (const q of buildQueries(name)) {
    const result = await queryOneMap(q);
    if (result) return result;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

const MANUAL_OVERRIDES = {
  "bishan clubhouse": { lat: 1.34948, lng: 103.85075, display: "51 BISHAN STREET 13 BISHAN COMMUNITY CLUB SINGAPORE 579799" },
  "bukit canberra sport centre": { lat: 1.44826, lng: 103.82276, display: "21 CANBERRA LINK BUKIT CANBERRA SINGAPORE 756973" },
  "bukit canberra sport hall": { lat: 1.44826, lng: 103.82276, display: "21 CANBERRA LINK BUKIT CANBERRA SINGAPORE 756973" },
  "si ling secondary school hall": { lat: 1.43254, lng: 103.77407, display: "11 MARSILING LANE SI LING SECONDARY SCHOOL SINGAPORE 739148" },
  "toa payoh sport centre": { lat: 1.33060, lng: 103.84999, display: "301 LORONG 6 TOA PAYOH SINGAPORE 319392" },
  "toa payoh sport hall": { lat: 1.33060, lng: 103.84999, display: "301 LORONG 6 TOA PAYOH SINGAPORE 319392" },
  "crescent girls' school hall": { lat: 1.28843, lng: 103.80008, display: "357 TANGLIN ROAD CRESCENT GIRLS SCHOOL SINGAPORE 247961" },
  "delta sport hall": { lat: 1.29008, lng: 103.82266, display: "900 TIONG BAHRU ROAD DELTA SPORTS HALL SINGAPORE 158790" },
  "delta sport centre": { lat: 1.29008, lng: 103.82266, display: "900 TIONG BAHRU ROAD DELTA SPORTS HALL SINGAPORE 158790" },
  "eunos primary school hall": { lat: 1.324223, lng: 103.904727, display: "95 JALAN EUNOS EUNOS PRIMARY SCHOOL SINGAPORE 419529" },
  "bukit panjang government high school hall": { lat: 1.37835, lng: 103.76292, display: "3 CHOA CHU KANG AVENUE 4 BUKIT PANJANG GOVT HIGH SCHOOL SINGAPORE 689811" },
  "clementi sport hall": { lat: 1.31148, lng: 103.76537, display: "518 CLEMENTI AVENUE 3 CLEMENTI SPORTS HALL SINGAPORE 129907" },
  "clementi sport centre": { lat: 1.31148, lng: 103.76537, display: "518 CLEMENTI AVENUE 3 CLEMENTI SPORTS HALL SINGAPORE 129907" },
  "choa chu kang sport hall": { lat: 1.38546, lng: 103.74729, display: "1 CHOA CHU KANG STREET 53 CHOA CHU KANG SPORTS HALL SINGAPORE 689236" },
  "moe (evans) sport hall": { lat: 1.31368, lng: 103.82050, display: "21 EVANS ROAD MOE (EVANS) SPORTS HALL SINGAPORE 259366" },
  "heartbeat @ bedok activesg sport hall": { lat: 1.32694, lng: 103.93200, display: "11 BEDOK NORTH STREET 1 HEARTBEAT@BEDOK SINGAPORE 469662" },
  "heartbeat@bedok activesg sport centre": { lat: 1.32694, lng: 103.93200, display: "11 BEDOK NORTH STREET 1 HEARTBEAT@BEDOK SINGAPORE 469662" },
  "our tampines hub - community auditorium": { lat: 1.35253, lng: 103.94048, display: "1 TAMPINES WALK OUR TAMPINES HUB SINGAPORE 528523" },
  "senja-cashew sport hall": { lat: 1.38171, lng: 103.76687, display: "101 BUKIT PANJANG ROAD SENJA-CASHEW CC SINGAPORE 679910" },
  "senja-cashew community centre": { lat: 1.38171, lng: 103.76687, display: "101 BUKIT PANJANG ROAD SENJA-CASHEW CC SINGAPORE 679910" },
  "first toa payoh primary school hall": { lat: 1.33270, lng: 103.84920, display: "1 TOA PAYOH LORONG 4 FIRST TOA PAYOH PRIMARY SCHOOL SINGAPORE 319693" },
  "red swastika school hall": { lat: 1.32600, lng: 103.93080, display: "11 BEDOK NORTH STREET 1 RED SWASTIKA SCHOOL SINGAPORE 469662" },
  "st. anthony's primary school hall": { lat: 1.30827, lng: 103.83145, display: "30 VICTORIA STREET ST ANTHONYS PRIMARY SCHOOL SINGAPORE 187996" },
  "st. gabriel's secondary school hall": { lat: 1.35025, lng: 103.89380, display: "5 UPPER SERANGOON ROAD ST GABRIELS SECONDARY SCHOOL SINGAPORE 347837" },
  "poi ching school hall": { lat: 1.34730, lng: 103.93460, display: "21 TAMPINES STREET 71 POI CHING SCHOOL SINGAPORE 529065" },
  "swiss cottage secondary school hall": { lat: 1.34000, lng: 103.78200, display: "7 BUKIT BATOK STREET 34 SWISS COTTAGE SECONDARY SCHOOL SINGAPORE 659322" },
};

async function main() {
  const cache = {};
  let done = 0;

  for (const name of VENUES) {
    const key = name.toLowerCase();
    let result = MANUAL_OVERRIDES[key] || null;

    if (!result) {
      result = await geocode(name);
      await new Promise((r) => setTimeout(r, 300));
    }

    done++;
    if (result) {
      cache[key] = result;
      console.log(`[${done}/${VENUES.length}] ✓ ${name}`);
    } else {
      console.log(`[${done}/${VENUES.length}] ✗ ${name} (not found)`);
    }
  }

  const js =
    "// Auto-generated by build-geocache.js — do not edit\n" +
    "const GEOCACHE = " +
    JSON.stringify(cache, null, 2) +
    ";\n";

  fs.writeFileSync("geocache.js", js);
  console.log(`\nDone! Wrote ${Object.keys(cache).length} entries to geocache.js`);
}

main();
