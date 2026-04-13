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

const VENUES = [
  "Admiralty Primary School Hall",
  "Ahmad Ibrahim Secondary School Hall",
  "Anchor Green Primary School Hall",
  "Ang Mo Kio Primary School Hall",
  "Angsana Primary School Hall",
  "Beacon Primary School Hall",
  "Beatty Secondary School Hall",
  "Bedok Green Primary School Hall",
  "Bedok South Secondary School Hall",
  "Bendemeer Primary School Hall",
  "Bendemeer Secondary School Hall",
  "Bishan Clubhouse",
  "Bishan Sport Hall",
  "Blangah Rise Primary School Hall",
  "Boon Lay Secondary School Hall",
  "Broadrick Secondary School Hall",
  "Bukit Batok Secondary School Hall",
  "Bukit Canberra Sport Centre",
  "Bukit Gombak Sport Centre",
  "Bukit Merah Secondary School Hall",
  "Bukit Panjang Primary School Hall",
  "Canberra Primary School Hall",
  "Canberra Secondary School Hall",
  "Canossa Catholic Primary School Hall",
  "Cantonment Primary School Hall",
  "Changkat Primary School Hall",
  "Choa Chu Kang Sport Centre",
  "Chongzheng Primary School Hall",
  "Clementi Sport Centre",
  "Compassvale Primary School Hall",
  "Compassvale Secondary School Hall",
  "Concord Primary School Hall",
  "Corporation Primary School Hall",
  "Crescent Girls' School Hall",
  "Crest Secondary School Hall",
  "Damai Primary School Hall",
  "Damai Secondary School Hall",
  "Dazhong Primary School Hall",
  "Delta Sport Centre",
  "Delta Sport Hall",
  "Deyi Secondary School Hall",
  "Dunman High School Hall",
  "East Spring Primary School Hall",
  "East Spring Secondary School Hall",
  "Edgefield Primary School Hall",
  "Edgefield Secondary School Hall",
  "Elias Park Primary School Hall",
  "Endeavour Primary School Hall",
  "Eunos Primary School Hall",
  "Evergreen Primary School Hall",
  "Evergreen Secondary School Hall",
  "Farrer Park Primary School Hall",
  "Fengshan Primary School Hall",
  "Fuhua Primary School Hall",
  "Gan Eng Seng Primary School Hall",
  "Geylang Methodist Primary School Hall",
  "Geylang Methodist Secondary School Hall",
  "Gongshang Primary School Hall",
  "Greendale Primary School Hall",
  "Greendale Secondary School Hall",
  "Greenridge Primary School Hall",
  "Greenridge Secondary School Hall",
  "Heartbeat@Bedok ActiveSG Sport Centre",
  "Hillgrove Secondary School Hall",
  "Hong Kah Secondary School Hall",
  "Hougang Primary School Hall",
  "Hougang Secondary School Hall",
  "Hougang Sport Centre",
  "Hua Yi Secondary School Hall",
  "Innova Primary School Hall",
  "Jalan Besar Sport Centre",
  "Jing Shan Primary School Hall",
  "Junyuan Primary School Hall",
  "Junyuan Secondary School Hall",
  "Jurong East Sport Centre",
  "Jurong Primary School Hall",
  "Jurong Secondary School Hall",
  "Jurong West Sport Centre",
  "Jurongville Secondary School Hall",
  "Kallang Sport Centre",
  "Kranji Primary School Hall",
  "Kranji Secondary School Hall",
  "Lakeside Primary School Hall",
  "Lianhua Primary School Hall",
  "Maha Bodhi School Hall",
  "Marsiling Primary School Hall",
  "Marsiling Secondary School Hall",
  "Meridian Primary School Hall",
  "Meridian Secondary School Hall",
  "Montfort Junior School Hall",
  "Montfort Secondary School Hall",
  "Nan Chiau Primary School Hall",
  "Nan Chiau High School Hall",
  "Naval Base Primary School Hall",
  "Naval Base Secondary School Hall",
  "New Town Primary School Hall",
  "Ngee Ann Primary School Hall",
  "North Vista Primary School Hall",
  "North Vista Secondary School Hall",
  "Northbrooks Secondary School Hall",
  "Oasis Primary School Hall",
  "Our Tampines Hub",
  "Palm View Primary School Hall",
  "Pasir Ris Sport Centre",
  "Paya Lebar Methodist Girls School Hall",
  "Pei Hwa Secondary School Hall",
  "Pioneer Primary School Hall",
  "Punggol Green Primary School Hall",
  "Punggol Primary School Hall",
  "Punggol Secondary School Hall",
  "Punggol View Primary School Hall",
  "Queenstown Primary School Hall",
  "Queenstown Sport Centre",
  "Queensway Secondary School Hall",
  "Rivervale Primary School Hall",
  "Riverside Primary School Hall",
  "Riverside Secondary School Hall",
  "Rosyth School Hall",
  "Sembawang Primary School Hall",
  "Sembawang Secondary School Hall",
  "Sengkang Green Primary School Hall",
  "Sengkang Sport Centre",
  "Senja-Cashew Community Centre",
  "Si Ling Primary School Hall",
  "Si Ling Secondary School Hall",
  "Springdale Primary School Hall",
  "Springfield Secondary School Hall",
  "Tampines North Community Centre",
  "Tampines Sport Centre",
  "Tanjong Katong Primary School Hall",
  "Tanjong Katong Secondary School Hall",
  "Temasek Primary School Hall",
  "Temasek Secondary School Hall",
  "Toa Payoh Sport Centre",
  "Townsville Primary School Hall",
  "Unity Primary School Hall",
  "West Spring Primary School Hall",
  "West Spring Secondary School Hall",
  "Westwood Primary School Hall",
  "Westwood Secondary School Hall",
  "White Sands Primary School Hall",
  "Woodgrove Primary School Hall",
  "Woodgrove Secondary School Hall",
  "Woodlands Primary School Hall",
  "Woodlands Ring Primary School Hall",
  "Woodlands Ring Secondary School Hall",
  "Woodlands Sport Centre",
  "Xinmin Primary School Hall",
  "Xinmin Secondary School Hall",
  "Yio Chu Kang Sport Centre",
  "Yishun Primary School Hall",
  "Yishun Secondary School Hall",
  "Yishun Sport Centre",
  "Yishun Town Secondary School Hall",
  "Yuhua Primary School Hall",
  "Yuhua Secondary School Hall",
  "Zhangde Primary School Hall",
  "Zhenghua Primary School Hall",
  "Zhenghua Secondary School Hall",
];

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
  const stripped = name.replace(/ Hall$/i, "");
  if (stripped !== name) queries.push(stripped);
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
  "si ling secondary school hall": { lat: 1.43254, lng: 103.77407, display: "11 MARSILING LANE SI LING SECONDARY SCHOOL SINGAPORE 739148" },
  "toa payoh sport centre": { lat: 1.33060, lng: 103.84999, display: "301 LORONG 6 TOA PAYOH SINGAPORE 319392" },
  "crescent girls' school hall": { lat: 1.28843, lng: 103.80008, display: "357 TANGLIN ROAD CRESCENT GIRLS SCHOOL SINGAPORE 247961" },
  "delta sport hall": { lat: 1.29008, lng: 103.82266, display: "900 TIONG BAHRU ROAD DELTA SPORTS HALL SINGAPORE 158790" },
  "eunos primary school hall": { lat: 1.324223, lng: 103.904727, display: "95 JALAN EUNOS EUNOS PRIMARY SCHOOL SINGAPORE 419529" },
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
