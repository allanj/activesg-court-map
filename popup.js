document.addEventListener("DOMContentLoaded", () => {
  const venueList = document.getElementById("venue-list");
  const searchInput = document.getElementById("search");
  const venueCountEl = document.getElementById("venue-count");
  const filtersEl = document.getElementById("filters");
  const tabs = document.querySelectorAll(".tab");
  const contentList = document.getElementById("content-list");
  const contentMap = document.getElementById("content-map");

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "lib/marker-icon-2x.png",
    iconUrl: "lib/marker-icon.png",
    shadowUrl: "lib/marker-shadow.png",
  });

  const uniqueVenues = new Map();
  for (const [name, data] of Object.entries(VENUE_DATABASE)) {
    const key = `${data.lat.toFixed(4)},${data.lng.toFixed(4)}`;
    if (!uniqueVenues.has(key)) {
      uniqueVenues.set(key, { name, ...data });
    }
  }

  const venues = Array.from(uniqueVenues.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  venueCountEl.textContent = `${venues.length} venues`;

  let overviewMap = null;
  let overviewLayer = null;
  let currentFilter = "";

  // ── Filter + nearest state ──

  let typeFilter = "all"; // all | centre | hall
  let regionFilter = "all"; // all | <region name>
  let nearestActive = false;
  let userLocation = null;

  function isSportCentre(name) {
    const lower = name.toLowerCase();
    return lower.includes("sport centre") || lower.includes("sports hall") ||
           lower.includes("sport hall") || lower.includes("clubhouse") ||
           lower.includes("our tampines");
  }

  function createMapUrl(lat, lng) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.004}%2C${lat - 0.003}%2C${lng + 0.004}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  function createGoogleMapsUrl(lat, lng, name) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
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

  function matchesFilter(venue, filter) {
    if (typeFilter === "centre" && !isSportCentre(venue.name)) return false;
    if (typeFilter === "hall" && isSportCentre(venue.name)) return false;
    if (regionFilter !== "all" && venue.region !== regionFilter) return false;
    if (!filter) return true;
    return (
      venue.name.toLowerCase().includes(filter) ||
      venue.address.toLowerCase().includes(filter) ||
      (venue.region && venue.region.toLowerCase().includes(filter))
    );
  }

  // Returns the venues passing the active filters, sorted by distance when
  // "Near me" is on, each tagged with a `_dist` (km) when location is known.
  function getFiltered(filter) {
    const result = venues
      .filter((venue) => matchesFilter(venue, filter))
      .map((venue) => {
        const dist =
          nearestActive && userLocation
            ? haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng)
            : null;
        return { ...venue, _dist: dist };
      });

    if (nearestActive && userLocation) {
      result.sort((a, b) => a._dist - b._dist);
    }
    return result;
  }

  // ── Filter chips ──

  function buildChips() {
    const regions = Array.from(
      new Set(venues.map((v) => v.region).filter(Boolean))
    ).sort();

    const typeChips = [
      { key: "all", label: "All" },
      { key: "centre", label: "Sport Centres" },
      { key: "hall", label: "School Halls" },
    ];

    filtersEl.innerHTML = "";

    const nearBtn = document.createElement("button");
    nearBtn.className = "chip near-me";
    nearBtn.type = "button";
    nearBtn.id = "near-me";
    nearBtn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg><span>Near me</span>';
    nearBtn.addEventListener("click", onNearMeClick);
    filtersEl.appendChild(nearBtn);

    filtersEl.appendChild(makeSeparator());

    typeChips.forEach((t) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (typeFilter === t.key ? " active" : "");
      chip.type = "button";
      chip.textContent = t.label;
      chip.addEventListener("click", () => {
        typeFilter = t.key;
        refreshChipStates();
        renderVenues(currentFilter);
      });
      chip.dataset.type = t.key;
      filtersEl.appendChild(chip);
    });

    filtersEl.appendChild(makeSeparator());

    [{ key: "all", label: "All regions" }, ...regions.map((r) => ({ key: r, label: r }))].forEach(
      (r) => {
        const chip = document.createElement("button");
        chip.className = "chip" + (regionFilter === r.key ? " active" : "");
        chip.type = "button";
        chip.textContent = r.label;
        chip.addEventListener("click", () => {
          regionFilter = r.key;
          refreshChipStates();
          renderVenues(currentFilter);
        });
        chip.dataset.region = r.key;
        filtersEl.appendChild(chip);
      }
    );
  }

  function makeSeparator() {
    const sep = document.createElement("div");
    sep.className = "chip-sep";
    return sep;
  }

  function refreshChipStates() {
    filtersEl.querySelectorAll(".chip[data-type]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.type === typeFilter);
    });
    filtersEl.querySelectorAll(".chip[data-region]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.region === regionFilter);
    });
    const nearBtn = document.getElementById("near-me");
    if (nearBtn) nearBtn.classList.toggle("active", nearestActive);
  }

  function onNearMeClick() {
    const nearBtn = document.getElementById("near-me");

    if (nearestActive) {
      nearestActive = false;
      refreshChipStates();
      renderVenues(currentFilter);
      return;
    }

    nearBtn.classList.add("locating");
    nearBtn.querySelector("span").textContent = "Locating…";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        nearestActive = true;
        nearBtn.classList.remove("locating");
        nearBtn.querySelector("span").textContent = "Near me";
        refreshChipStates();
        renderVenues(currentFilter);
      },
      () => {
        nearBtn.classList.remove("locating");
        nearBtn.querySelector("span").textContent = "Near me";
        venueCountEl.textContent = "Location unavailable";
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // ── Overview map ──

  function initOverviewMap() {
    if (overviewMap) {
      overviewMap.invalidateSize();
      renderOverviewMap(currentFilter);
      return;
    }

    overviewMap = L.map("overview-map", { zoomControl: true }).setView([1.3521, 103.8198], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(overviewMap);

    overviewLayer = L.layerGroup().addTo(overviewMap);
    renderOverviewMap(currentFilter);
  }

  function renderOverviewMap(filter = "") {
    if (!overviewMap || !overviewLayer) return;

    const filtered = getFiltered(filter);
    overviewMap.stop();
    overviewLayer.clearLayers();

    const markers = filtered.map((venue) => {
      const marker = L.marker([venue.lat, venue.lng]).bindPopup(`
        <div class="overview-popup-title">${escapeHtml(venue.name)}</div>
        <div class="overview-popup-address">${escapeHtml(venue.address)}</div>
        <a class="overview-popup-link" href="${createGoogleMapsUrl(venue.lat, venue.lng, venue.name)}" target="_blank" rel="noopener noreferrer">
          Open in Google Maps &rarr;
        </a>
      `);
      marker.addTo(overviewLayer);
      return marker;
    });

    if (markers.length === 1) {
      overviewMap.setView(markers[0].getLatLng(), 15, { animate: false });
      markers[0].openPopup();
    } else if (markers.length > 1) {
      const latValues = filtered.map((venue) => venue.lat);
      const lngValues = filtered.map((venue) => venue.lng);
      const latSpread = Math.max(...latValues) - Math.min(...latValues);
      const lngSpread = Math.max(...lngValues) - Math.min(...lngValues);

      if (latSpread < 0.02 && lngSpread < 0.02) {
        const centerLat = latValues.reduce((sum, lat) => sum + lat, 0) / latValues.length;
        const centerLng = lngValues.reduce((sum, lng) => sum + lng, 0) / lngValues.length;
        overviewMap.setView([centerLat, centerLng], 15, { animate: false });
      } else {
        overviewMap.fitBounds(L.featureGroup(markers).getBounds().pad(0.12), { animate: false });
      }
    } else {
      overviewMap.setView([1.3521, 103.8198], 11, { animate: false });
    }
  }

  // ── Venue list ──

  function renderVenues(filter = "") {
    currentFilter = filter;
    const filtered = getFiltered(filter);

    let countLabel = `${venues.length} venues`;
    if (filtered.length !== venues.length) {
      countLabel = `${filtered.length} of ${venues.length} venues`;
    }
    if (nearestActive && userLocation) countLabel += " · by distance";
    venueCountEl.textContent = countLabel;

    renderOverviewMap(filter);

    if (filtered.length === 0) {
      venueList.innerHTML = '<div class="no-results">No venues found</div>';
      return;
    }

    venueList.innerHTML = filtered
      .map((v, idx) => {
        const distHtml =
          v._dist != null
            ? `<span class="venue-distance${idx === 0 ? " closest" : ""}">${formatDistance(v._dist)}</span>`
            : "";
        return `
      <div class="venue-item" data-lat="${v.lat}" data-lng="${v.lng}">
        <div class="venue-icon ${isSportCentre(v.name) ? "sport-centre" : "school-hall"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="venue-info">
          <div class="venue-name">${escapeHtml(v.name)}${distHtml}</div>
          <div class="venue-address">${escapeHtml(v.address)}</div>
          <span class="venue-region">${escapeHtml(v.region || "")}</span>
          <div class="venue-map-preview">
            <iframe loading="lazy"></iframe>
            <div class="map-actions">
              <a href="${createGoogleMapsUrl(v.lat, v.lng, v.name)}" target="_blank" rel="noopener noreferrer">Open in Google Maps &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    `;
      })
      .join("");

    venueList.querySelectorAll(".venue-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return;

        const preview = item.querySelector(".venue-map-preview");
        const wasVisible = preview.classList.contains("visible");

        venueList
          .querySelectorAll(".venue-map-preview.visible")
          .forEach((p) => p.classList.remove("visible"));
        venueList
          .querySelectorAll(".venue-item.expanded")
          .forEach((i) => i.classList.remove("expanded"));

        if (!wasVisible) {
          preview.classList.add("visible");
          item.classList.add("expanded");
          const iframe = preview.querySelector("iframe");
          if (!iframe.src || iframe.src === "about:blank") {
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            iframe.src = createMapUrl(lat, lng);
          }
          preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });
  }

  buildChips();
  renderVenues();

  searchInput.addEventListener("input", (e) => {
    renderVenues(e.target.value.toLowerCase().trim());
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      if (tab.dataset.tab === "list") {
        contentList.classList.remove("hidden");
        contentMap.classList.add("hidden");
      } else {
        contentList.classList.add("hidden");
        contentMap.classList.remove("hidden");
        requestAnimationFrame(initOverviewMap);
      }
    });
  });
});
