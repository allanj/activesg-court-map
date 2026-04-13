document.addEventListener("DOMContentLoaded", () => {
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
  const statusEl = document.getElementById("status");

  let allVenues = [];
  let markers = [];
  let activeItem = null;

  // ── Geocoding with Nominatim (rate-limited, cached) ──

  const geoCache = {};
  let geoQueue = [];
  let geoRunning = false;

  function geocode(name) {
    return new Promise((resolve) => {
      const key = name.toLowerCase();
      if (geoCache[key]) {
        resolve(geoCache[key]);
        return;
      }
      geoQueue.push({ name, key, resolve });
      processQueue();
    });
  }

  function processQueue() {
    if (geoRunning || geoQueue.length === 0) return;
    geoRunning = true;

    const { name, key, resolve } = geoQueue.shift();
    const query = encodeURIComponent(name + ", Singapore");
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=sg`;

    fetch(url, { headers: { "Accept-Language": "en" } })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          const result = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          };
          geoCache[key] = result;
          resolve(result);
        } else {
          geoCache[key] = null;
          resolve(null);
        }
      })
      .catch(() => {
        resolve(null);
      })
      .finally(() => {
        geoRunning = false;
        // Nominatim rate limit: 1 req/sec
        setTimeout(processQueue, 1100);
      });
  }

  function googleMapsSearchUrl(name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " Singapore")}`;
  }

  // ── Rendering ──

  function clearMarkers() {
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
  }

  function fitMapToMarkers() {
    if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), 15);
    } else if (markers.length > 1) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15));
    }
  }

  function renderVenues(venues, filter) {
    const query = (filter || "").toLowerCase();
    const filtered = query
      ? venues.filter((v) => v.name.toLowerCase().includes(query))
      : venues;

    clearMarkers();
    venueListEl.innerHTML = "";

    if (filtered.length === 0) {
      venueListEl.innerHTML = '<div class="empty-state">No venues found on this page</div>';
      statusEl.textContent = "";
      return;
    }

    let geocoded = 0;
    statusEl.textContent = `Locating 0/${filtered.length}...`;

    filtered.forEach((venue, idx) => {
      const item = document.createElement("div");
      item.className = "venue-item";
      item.innerHTML = `
        <div class="venue-name">${venue.name}</div>
        <div class="venue-meta">
          <span class="venue-status">Locating...</span>
          <a href="${googleMapsSearchUrl(venue.name)}" target="_blank" class="venue-gmaps">Google Maps</a>
        </div>
      `;
      venueListEl.appendChild(item);

      geocode(venue.name).then((result) => {
        geocoded++;
        statusEl.textContent =
          geocoded < filtered.length
            ? `Locating ${geocoded}/${filtered.length}...`
            : `${filtered.length} venues located`;

        const statusSpan = item.querySelector(".venue-status");

        if (result) {
          venue.lat = result.lat;
          venue.lng = result.lng;

          const marker = L.marker([result.lat, result.lng])
            .bindPopup(
              `<strong>${venue.name}</strong><br>` +
                `<span style="font-size:11px;color:#666">${result.displayName}</span><br>` +
                `<a href="${googleMapsSearchUrl(venue.name)}" target="_blank" style="font-size:11px">Google Maps &rarr;</a>`
            )
            .addTo(map);
          markers.push(marker);

          statusSpan.textContent = result.displayName.split(",").slice(0, 2).join(",");
          statusSpan.className = "venue-address";

          item.addEventListener("click", (e) => {
            if (e.target.tagName === "A") return;
            map.setView([result.lat, result.lng], 16);
            marker.openPopup();
            if (activeItem) activeItem.classList.remove("active");
            item.classList.add("active");
            activeItem = item;
          });

          fitMapToMarkers();
        } else {
          statusSpan.textContent = "Location not found";
          statusSpan.className = "venue-status venue-not-found";

          item.addEventListener("click", (e) => {
            if (e.target.tagName === "A") return;
            window.open(googleMapsSearchUrl(venue.name), "_blank");
          });
        }
      });
    });
  }

  // ── Event handling ──

  let currentVenues = [];

  searchInput.addEventListener("input", (e) => {
    renderVenues(currentVenues, e.target.value.trim());
  });

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "asg-venues") {
      currentVenues = event.data.venues || [];
      searchInput.value = "";
      renderVenues(currentVenues, "");
    }
  });
});
