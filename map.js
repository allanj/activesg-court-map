const params = new URLSearchParams(location.search);
const lat = parseFloat(params.get("lat"));
const lng = parseFloat(params.get("lng"));

if (lat && lng) {
  const bbox = [lng - 0.004, lat - 0.003, lng + 0.004, lat + 0.003].join("%2C");
  document.getElementById("map").src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}
