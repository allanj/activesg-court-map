chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "geocode") return false;

  const query = encodeURIComponent(msg.name);
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${query}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      if (data && data.results && data.results.length > 0) {
        const r = data.results[0];
        sendResponse({
          lat: parseFloat(r.LATITUDE),
          lng: parseFloat(r.LONGITUDE),
          displayName: r.ADDRESS || r.SEARCHVAL,
        });
      } else {
        sendResponse(null);
      }
    })
    .catch(() => sendResponse(null));

  return true;
});
