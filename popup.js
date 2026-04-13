document.addEventListener("DOMContentLoaded", () => {
  const venueList = document.getElementById("venue-list");
  const searchInput = document.getElementById("search");
  const venueCountEl = document.getElementById("venue-count");
  const tabs = document.querySelectorAll(".tab");
  const contentList = document.getElementById("content-list");
  const contentMap = document.getElementById("content-map");

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

  function renderVenues(filter = "") {
    const filtered = filter
      ? venues.filter(
          (v) =>
            v.name.toLowerCase().includes(filter) ||
            v.address.toLowerCase().includes(filter) ||
            (v.region && v.region.toLowerCase().includes(filter))
        )
      : venues;

    if (filtered.length === 0) {
      venueList.innerHTML = '<div class="no-results">No venues found</div>';
      return;
    }

    venueList.innerHTML = filtered
      .map(
        (v) => `
      <div class="venue-item" data-lat="${v.lat}" data-lng="${v.lng}" data-name="${v.name}">
        <div class="venue-icon ${isSportCentre(v.name) ? "sport-centre" : "school-hall"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="venue-info">
          <div class="venue-name">${v.name}</div>
          <div class="venue-address">${v.address}</div>
          <span class="venue-region">${v.region || ""}</span>
          <div class="venue-map-preview">
            <iframe loading="lazy"></iframe>
            <div class="map-actions">
              <a href="${createGoogleMapsUrl(v.lat, v.lng, v.name)}" target="_blank">Open in Google Maps &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    `
      )
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
      }
    });
  });
});
