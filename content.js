(function () {
  "use strict";

  const MAP_ZOOM = 16;
  const MAP_WIDTH = 280;
  const MAP_HEIGHT = 200;

  function normalizeVenueName(name) {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\u2019/g, "'");
  }

  function findVenue(name) {
    const normalized = normalizeVenueName(name);
    if (VENUE_DATABASE[normalized]) return { name: normalized, ...VENUE_DATABASE[normalized] };

    const lower = normalized.toLowerCase();
    for (const [key, data] of Object.entries(VENUE_DATABASE)) {
      if (key.toLowerCase() === lower) return { name: key, ...data };
    }

    for (const [key, data] of Object.entries(VENUE_DATABASE)) {
      const keyLower = key.toLowerCase();
      if (lower.includes(keyLower) || keyLower.includes(lower)) {
        return { name: key, ...data };
      }
    }

    const words = lower.split(" ").filter((w) => w.length > 3);
    for (const [key, data] of Object.entries(VENUE_DATABASE)) {
      const keyLower = key.toLowerCase();
      const matchCount = words.filter((w) => keyLower.includes(w)).length;
      if (matchCount >= 2 && matchCount >= words.length * 0.5) {
        return { name: key, ...data };
      }
    }

    return null;
  }

  function createMapTile(lat, lng) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003}%2C${lat - 0.002}%2C${lng + 0.003}%2C${lat + 0.002}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  function createGoogleMapsLink(lat, lng, name) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;
  }

  function createMapPopup(venue) {
    const popup = document.createElement("div");
    popup.className = "asg-map-popup";
    popup.innerHTML = `
      <div class="asg-map-popup-header">
        <span class="asg-map-popup-title">${venue.name}</span>
        <button class="asg-map-popup-close">&times;</button>
      </div>
      <div class="asg-map-popup-body">
        <iframe
          class="asg-map-iframe"
          src="${createMapTile(venue.lat, venue.lng)}"
          width="${MAP_WIDTH}"
          height="${MAP_HEIGHT}"
          frameborder="0"
          scrolling="no"
        ></iframe>
        <div class="asg-map-popup-info">
          <p class="asg-map-address">${venue.address}</p>
          <a class="asg-map-link" href="${createGoogleMapsLink(venue.lat, venue.lng, venue.name)}" target="_blank" rel="noopener">
            Open in Google Maps &rarr;
          </a>
        </div>
      </div>
    `;

    popup.querySelector(".asg-map-popup-close").addEventListener("click", () => {
      popup.remove();
    });

    document.addEventListener("click", function handler(e) {
      if (!popup.contains(e.target) && !e.target.classList.contains("asg-map-btn")) {
        popup.remove();
        document.removeEventListener("click", handler);
      }
    });

    return popup;
  }

  function createMapButton(venue) {
    const btn = document.createElement("button");
    btn.className = "asg-map-btn";
    btn.title = `View ${venue.name} on map`;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>Map</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const existing = document.querySelector(".asg-map-popup");
      if (existing) existing.remove();

      const popup = createMapPopup(venue);
      btn.parentElement.style.position = "relative";
      btn.parentElement.appendChild(popup);
    });

    return btn;
  }

  function createInlineMapPreview(venue) {
    const container = document.createElement("div");
    container.className = "asg-inline-map";
    container.innerHTML = `
      <div class="asg-inline-map-preview" title="Click to expand map">
        <img
          src="https://staticmap.openstreetmap.de/staticmap.php?center=${venue.lat},${venue.lng}&zoom=${MAP_ZOOM}&size=280x150&markers=${venue.lat},${venue.lng},red-pushpin"
          alt="Map of ${venue.name}"
          loading="lazy"
          onerror="this.parentElement.innerHTML='<iframe src=\\'${createMapTile(venue.lat, venue.lng)}\\' width=\\'280\\' height=\\'150\\' frameborder=\\'0\\' scrolling=\\'no\\'></iframe>'"
        />
      </div>
      <div class="asg-inline-map-footer">
        <span class="asg-inline-map-address">${venue.address}</span>
        <a href="${createGoogleMapsLink(venue.lat, venue.lng, venue.name)}" target="_blank" rel="noopener" class="asg-inline-map-link">
          Google Maps &rarr;
        </a>
      </div>
    `;
    return container;
  }

  function processVenueElements() {
    const venueCards = document.querySelectorAll(
      '[class*="venue"], [class*="Venue"], [class*="facility"], [class*="Facility"], [class*="card"], [class*="Card"], [data-testid*="venue"]'
    );

    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']");
    const links = document.querySelectorAll("a");
    const listItems = document.querySelectorAll("li, [role='listitem'], [role='option']");

    const allCandidates = new Set([...venueCards, ...headings, ...links, ...listItems]);

    const processed = new Set();
    let matchCount = 0;

    for (const el of allCandidates) {
      if (el.querySelector(".asg-map-btn, .asg-inline-map")) continue;

      const text = el.textContent?.trim();
      if (!text || text.length > 200 || text.length < 5) continue;

      const venue = findVenue(text);
      if (!venue) continue;

      const key = `${venue.name}-${el.tagName}`;
      if (processed.has(key)) continue;
      processed.add(key);

      if (el.closest(".asg-map-popup, .asg-inline-map")) continue;

      const btn = createMapButton(venue);
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.gap = "8px";
      el.style.flexWrap = "wrap";
      el.appendChild(btn);
      matchCount++;
    }

    if (matchCount === 0) {
      processVenuesByTextScan();
    }
  }

  function processVenuesByTextScan() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.closest(".asg-map-popup, .asg-inline-map, .asg-map-btn")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.children.length === 0 || node.querySelector(":scope > *") === null) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    const processed = new Set();
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (!text || text.length > 150 || text.length < 5) continue;
      if (node.querySelector(".asg-map-btn")) continue;

      const venue = findVenue(text);
      if (!venue) continue;

      const key = venue.name;
      if (processed.has(key)) continue;
      processed.add(key);

      const btn = createMapButton(venue);
      node.style.display = "inline-flex";
      node.style.alignItems = "center";
      node.style.gap = "8px";
      node.appendChild(btn);
    }
  }

  function init() {
    processVenueElements();

    const observer = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains("asg-map-popup")) {
              hasNewNodes = true;
              break;
            }
          }
        }
        if (hasNewNodes) break;
      }
      if (hasNewNodes) {
        clearTimeout(window._asgMapDebounce);
        window._asgMapDebounce = setTimeout(processVenueElements, 500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
