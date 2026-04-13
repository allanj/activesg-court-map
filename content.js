(function () {
  "use strict";

  function normalizeVenueName(name) {
    return name.trim().replace(/\s+/g, " ").replace(/\u2019/g, "'");
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

  function createMapEmbedUrl(lat, lng) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.004}%2C${lat - 0.003}%2C${lng + 0.004}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  function createGoogleMapsLink(lat, lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  function createInlineMap(venue) {
    const el = document.createElement("div");
    el.className = "asg-court-map";
    el.setAttribute("data-venue", venue.name);
    el.innerHTML = `
      <iframe
        src="${createMapEmbedUrl(venue.lat, venue.lng)}"
        class="asg-court-map-iframe"
        loading="lazy"
        scrolling="no"
      ></iframe>
      <div class="asg-court-map-info">
        <span class="asg-court-map-addr">${venue.address}</span>
        <a href="${createGoogleMapsLink(venue.lat, venue.lng)}" target="_blank" rel="noopener" class="asg-court-map-gmaps">Google Maps &rarr;</a>
      </div>
    `;
    return el;
  }

  function findCardContainer(el) {
    let current = el;
    for (let i = 0; i < 8; i++) {
      if (!current.parentElement || current.parentElement === document.body) break;
      current = current.parentElement;
      const style = window.getComputedStyle(current);
      const hasBorder = style.borderWidth && style.borderWidth !== "0px";
      const hasShadow = style.boxShadow && style.boxShadow !== "none";
      const hasBg = style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
      const hasRadius = style.borderRadius && style.borderRadius !== "0px";

      if ((hasBorder || hasShadow) && (hasBg || hasRadius)) {
        return current;
      }
    }
    return null;
  }

  function processPage() {
    const processedVenues = new Set();

    document.querySelectorAll(".asg-court-map").forEach((el) => {
      processedVenues.add(el.getAttribute("data-venue"));
    });

    const allElements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, a, span, p, div, [role="heading"], [role="listitem"], [role="option"], li'
    );

    for (const el of allElements) {
      if (el.closest(".asg-court-map")) continue;

      const directText = getDirectText(el);
      if (!directText || directText.length < 5 || directText.length > 120) continue;

      const venue = findVenue(directText);
      if (!venue) continue;
      if (processedVenues.has(venue.name)) continue;

      const card = findCardContainer(el);
      const target = card || el.parentElement;
      if (!target) continue;

      if (target.querySelector(".asg-court-map")) continue;

      processedVenues.add(venue.name);
      const mapWidget = createInlineMap(venue);
      target.appendChild(mapWidget);
    }
  }

  function getDirectText(el) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  function init() {
    processPage();

    const observer = new MutationObserver((mutations) => {
      let hasNewContent = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains("asg-court-map")) {
            hasNewContent = true;
            break;
          }
        }
        if (hasNewContent) break;
      }
      if (hasNewContent) {
        clearTimeout(window._asgMapDebounce);
        window._asgMapDebounce = setTimeout(processPage, 600);
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
