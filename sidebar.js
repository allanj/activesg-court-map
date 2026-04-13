document.addEventListener("DOMContentLoaded", () => {
  // Fix Leaflet marker icon paths to point at our bundled images
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "lib/marker-icon-2x.png",
    iconUrl: "lib/marker-icon.png",
    shadowUrl: "lib/marker-shadow.png",
  });

  const map = L.map("map", { zoomControl: false }).setView([1.3521, 103.8198], 11);
  L.control.zoom({ position: "topright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18,
  }).addTo(map);

  const searchInput = document.getElementById("search");
  const venueListEl = document.getElementById("venue-list");

  let allVenues = [];
  let markers = [];
  let activeItem = null;

  function createGoogleMapsUrl(lat, lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  function renderVenues(filter) {
    const query = (filter || "").toLowerCase();
    const filtered = query
      ? allVenues.filter(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            v.address.toLowerCase().includes(query) ||
            (v.region || "").toLowerCase().includes(query)
        )
      : allVenues;

    markers.forEach((m) => map.removeLayer(m.marker));
    markers = [];

    if (filtered.length === 0) {
      venueListEl.innerHTML = '<div class="empty-state">No venues found</div>';
      return;
    }

    venueListEl.innerHTML = "";

    filtered.forEach((venue) => {
      const hasCoords = venue.lat != null && venue.lng != null;
      let marker = null;

      if (hasCoords) {
        marker = L.marker([venue.lat, venue.lng])
          .bindPopup(
            `<strong>${venue.name}</strong><br>` +
              `<span style="font-size:11px;color:#666">${venue.address}</span><br>` +
              `<a href="${createGoogleMapsUrl(venue.lat, venue.lng)}" target="_blank" style="font-size:11px">Google Maps &rarr;</a>`
          )
          .addTo(map);
        markers.push({ marker, venue });
      }

      const searchUrl = hasCoords
        ? createGoogleMapsUrl(venue.lat, venue.lng)
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + " Singapore")}`;

      const item = document.createElement("div");
      item.className = "venue-item" + (venue.onPage ? " on-page" : "") + (venue.unmatched ? " unmatched" : "");
      item.innerHTML = `
        <div class="venue-name">${venue.name}${venue.unmatched ? '<span class="venue-tag-unknown">no coords</span>' : ""}</div>
        <div class="venue-meta">
          <span class="venue-address">${venue.address || "Address not in database"}</span>
          <a href="${searchUrl}" target="_blank" class="venue-gmaps">Maps</a>
        </div>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return;
        if (hasCoords) {
          map.setView([venue.lat, venue.lng], 16);
          if (marker) marker.openPopup();
        } else {
          window.open(searchUrl, "_blank");
        }
        if (activeItem) activeItem.classList.remove("active");
        item.classList.add("active");
        activeItem = item;
      });

      venueListEl.appendChild(item);
    });

    if (filtered.length > 0) {
      const group = L.featureGroup(markers.map((m) => m.marker));
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }

  searchInput.addEventListener("input", (e) => {
    renderVenues(e.target.value.trim());
  });

  // Listen for venue data from the content script
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "asg-venues") {
      allVenues = event.data.venues || [];
      renderVenues("");
    }
  });
});
