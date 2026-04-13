function buildQueries(name) {
  const queries = [name];
  const noHall = name.replace(/ Hall$/i, "");
  if (noHall !== name) queries.push(noHall);
  const noSchoolHall = name.replace(/ (Primary |Secondary |High )?School Hall$/i, "");
  if (noSchoolHall !== name) queries.push(noSchoolHall + " School");
  const noSportHall = name.replace(/ Sport (Hall|Centre)$/i, "");
  if (noSportHall !== name) queries.push(noSportHall + " Sports Hall");
  return queries;
}

async function geocodeOneMap(name) {
  for (const q of buildQueries(name)) {
    try {
      const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const r = data.results[0];
        return {
          lat: parseFloat(r.LATITUDE),
          lng: parseFloat(r.LONGITUDE),
          displayName: r.ADDRESS || r.SEARCHVAL,
        };
      }
    } catch {}
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "geocode") return false;
  geocodeOneMap(msg.name).then(sendResponse);
  return true;
});
