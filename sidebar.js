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

  // ── Geocoding: pre-built cache → persisted fallback → OneMap fallback ──

  const STORAGE_KEY = "asg-geocode-cache";
  const runtimeCache = {};

  // Hydrate memory cache with previously resolved OneMap fallbacks so we
  // don't re-query OneMap for the same venues on every page load.
  const storageReady = (async () => {
    try {
      const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
      if (stored) {
        for (const [key, value] of Object.entries(stored)) {
          if (runtimeCache[key] === undefined) runtimeCache[key] = value;
        }
      }
    } catch {}
  })();

  function persistGeocode(key, value) {
    chrome.storage.local
      .get(STORAGE_KEY)
      .then((data) => {
        const map = data[STORAGE_KEY] || {};
        map[key] = value;
        return chrome.storage.local.set({ [STORAGE_KEY]: map });
      })
      .catch(() => {});
  }

  function geocode(name) {
    const key = name.toLowerCase();

    if (runtimeCache[key] !== undefined) {
      return Promise.resolve(runtimeCache[key]);
    }

    if (typeof GEOCACHE !== "undefined" && GEOCACHE[key]) {
      const entry = GEOCACHE[key];
      const result = { lat: entry.lat, lng: entry.lng, displayName: entry.display };
      runtimeCache[key] = result;
      return Promise.resolve(result);
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "geocode", name }, (result) => {
        if (result) {
          runtimeCache[key] = result;
          persistGeocode(key, result);
          resolve(result);
        } else {
          // Keep null in memory only — a missing venue may be added later.
          runtimeCache[key] = null;
          resolve(null);
        }
      });
    });
  }

  function googleMapsSearchUrl(name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " Singapore")}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  // ── Distance helpers ──

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(km) {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  }

  let userLocation = null;
  let userMarker = null;
  let sortByNearest = false;

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

  // Open a marker's popup only after the current map movement settles, so
  // Leaflet's auto-pan measures the final viewport instead of a
  // mid-animation one (which leaves the popup clipped at the map edge).
  function openPopupWhenSettled(marker) {
    const open = () => marker.openPopup();
    map.once("moveend", open);
    setTimeout(() => {
      map.off("moveend", open);
      if (!marker.isPopupOpen()) marker.openPopup();
    }, 700);
  }

  function focusNearestMarker(marker) {
    const focusMarkers = userMarker ? [marker, userMarker] : [marker];
    if (focusMarkers.length > 1) {
      map.fitBounds(L.featureGroup(focusMarkers).getBounds().pad(0.35), {
        maxZoom: 15,
      });
    } else {
      map.setView(marker.getLatLng(), 15);
    }
    openPopupWhenSettled(marker);
  }

  async function renderVenues(venues, filter) {
    const query = (filter || "").toLowerCase();
    let filtered = query
      ? venues.filter((v) => v.name.toLowerCase().includes(query))
      : [...venues];

    clearMarkers();
    venueListEl.innerHTML = "";

    if (filtered.length === 0) {
      venueListEl.innerHTML = '<div class="empty-state">No venues found on this page</div>';
      statusEl.textContent = "";
      return;
    }

    statusEl.textContent = `Locating venues...`;

    // Make sure persisted fallback geocodes are loaded before we resolve.
    await storageReady;

    const resolved = await Promise.all(
      filtered.map(async (venue) => {
        const result = await geocode(venue.name);
        return { venue, result };
      })
    );

    if (sortByNearest && userLocation) {
      resolved.sort((a, b) => {
        if (!a.result && !b.result) return 0;
        if (!a.result) return 1;
        if (!b.result) return -1;
        const distA = haversineKm(userLocation.lat, userLocation.lng, a.result.lat, a.result.lng);
        const distB = haversineKm(userLocation.lat, userLocation.lng, b.result.lat, b.result.lng);
        return distA - distB;
      });
    }

    clearMarkers();
    venueListEl.innerHTML = "";

    let nearestMarker = null;
    let nearestItem = null;

    resolved.forEach(({ venue, result }, idx) => {
      const item = document.createElement("div");
      item.className = "venue-item";
      const venueName = escapeHtml(venue.name);

      let distHtml = "";
      if (sortByNearest && userLocation && result) {
        const km = haversineKm(userLocation.lat, userLocation.lng, result.lat, result.lng);
        const isClosest = idx === 0;
        distHtml = `<span class="venue-distance${isClosest ? " closest" : ""}">${formatDistance(km)}</span>`;
      }

      if (result) {
        venue.lat = result.lat;
        venue.lng = result.lng;
        const displayName = escapeHtml(result.displayName);
        const shortDisplayName = escapeHtml(result.displayName.split(",").slice(0, 2).join(","));

        const marker = L.marker([result.lat, result.lng])
          .bindPopup(
            `<strong>${venueName}</strong><br>` +
              `<span style="font-size:11px;color:#666">${displayName}</span><br>` +
              `<a href="${googleMapsSearchUrl(venue.name)}" target="_blank" rel="noopener noreferrer" style="font-size:11px">Google Maps &rarr;</a>`,
            { maxWidth: 220, autoPanPadding: L.point(12, 12) }
          )
          .addTo(map);
        markers.push(marker);
        if (sortByNearest && userLocation && !nearestMarker) {
          nearestMarker = marker;
        }

        item.innerHTML = `
          <div class="venue-name">${venueName}</div>
          <div class="venue-meta">
            <span class="venue-address">${shortDisplayName}</span>
            ${distHtml}
            <a href="${googleMapsSearchUrl(venue.name)}" target="_blank" rel="noopener noreferrer" class="venue-gmaps">Google Maps</a>
          </div>
        `;

        item.addEventListener("click", (e) => {
          if (e.target.tagName === "A") return;
          map.setView([result.lat, result.lng], 16);
          openPopupWhenSettled(marker);
          if (activeItem) activeItem.classList.remove("active");
          item.classList.add("active");
          activeItem = item;
        });
      } else {
        item.innerHTML = `
          <div class="venue-name">${venueName}</div>
          <div class="venue-meta">
            <span class="venue-status venue-not-found">Location not found</span>
            ${distHtml}
            <a href="${googleMapsSearchUrl(venue.name)}" target="_blank" rel="noopener noreferrer" class="venue-gmaps">Google Maps</a>
          </div>
        `;
        item.addEventListener("click", (e) => {
          if (e.target.tagName === "A") return;
          window.open(googleMapsSearchUrl(venue.name), "_blank");
        });
      }

      if (sortByNearest && userLocation && idx === 0 && result) {
        nearestItem = item;
      }

      venueListEl.appendChild(item);
    });

    if (nearestMarker) {
      focusNearestMarker(nearestMarker);
      if (nearestItem) {
        if (activeItem) activeItem.classList.remove("active");
        nearestItem.classList.add("active");
        activeItem = nearestItem;
      }
    } else {
      fitMapToMarkers();
    }
    statusEl.textContent = sortByNearest && userLocation
      ? `${resolved.length} venues sorted by distance`
      : `${resolved.length} venues located`;
  }

  // ── Event handling ──

  let currentVenues = [];
  const nearestBtn = document.getElementById("nearest-btn");

  searchInput.addEventListener("input", (e) => {
    renderVenues(currentVenues, e.target.value.trim());
  });

  nearestBtn.addEventListener("click", () => {
    if (sortByNearest) {
      sortByNearest = false;
      nearestBtn.classList.remove("active");
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      renderVenues(currentVenues, searchInput.value.trim());
      return;
    }

    nearestBtn.classList.add("locating");
    nearestBtn.querySelector("span").textContent = "Locating\u2026";
    statusEl.textContent = "Getting your location\u2026";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        sortByNearest = true;
        nearestBtn.classList.remove("locating");
        nearestBtn.classList.add("active");
        nearestBtn.querySelector("span").textContent = "Nearest";

        if (userMarker) map.removeLayer(userMarker);
        const youIcon = L.divIcon({
          className: "you-marker",
          html: '<div style="width:14px;height:14px;background:#4285f4;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: youIcon })
          .bindPopup("<strong>You are here</strong>")
          .addTo(map);

        renderVenues(currentVenues, searchInput.value.trim());
      },
      (err) => {
        nearestBtn.classList.remove("locating");
        nearestBtn.querySelector("span").textContent = "Nearest";
        statusEl.textContent = "Could not get location \u2013 check browser permissions";
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== "https://activesg.gov.sg") return;
    if (event.data && event.data.type === "asg-venues") {
      currentVenues = event.data.venues || [];
      searchInput.value = "";
      renderVenues(currentVenues, "");
    }
  });
});
