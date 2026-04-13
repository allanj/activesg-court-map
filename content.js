(function () {
  "use strict";

  const SIDEBAR_WIDTH = 350;
  let sidebarOpen = false;
  let sidebarFrame = null;
  let sidebarReady = false;
  let pendingVenues = null;

  // ── Venue matching ──

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
      const kl = key.toLowerCase();
      if (lower.includes(kl) || kl.includes(lower)) return { name: key, ...data };
    }
    const words = lower.split(" ").filter((w) => w.length > 3);
    for (const [key, data] of Object.entries(VENUE_DATABASE)) {
      const kl = key.toLowerCase();
      const hits = words.filter((w) => kl.includes(w)).length;
      if (hits >= 2 && hits >= words.length * 0.5) return { name: key, ...data };
    }
    return null;
  }

  function getDirectText(el) {
    let t = "";
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) t += n.textContent;
    }
    return t.trim();
  }

  function looksLikeVenueName(text) {
    const lower = text.toLowerCase();
    return (
      lower.includes("school hall") ||
      lower.includes("sport hall") ||
      lower.includes("sports hall") ||
      lower.includes("sport centre") ||
      lower.includes("sports centre") ||
      lower.includes("community centre") ||
      lower.includes("clubhouse") ||
      lower.includes("tampines hub")
    );
  }

  function scanPageVenues() {
    const found = new Map();
    const els = document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,a,span,p,div,[role="heading"],[role="listitem"],[role="option"],li'
    );
    for (const el of els) {
      const text = getDirectText(el);
      if (!text || text.length < 5 || text.length > 120) continue;

      const venue = findVenue(text);
      if (venue && !found.has(venue.name)) {
        found.set(venue.name, { ...venue, onPage: true });
      } else if (!venue && looksLikeVenueName(text) && !found.has(text)) {
        found.set(text, {
          name: text,
          lat: null,
          lng: null,
          address: "",
          region: "",
          onPage: true,
          unmatched: true,
        });
      }
    }
    return Array.from(found.values());
  }

  // ── Sidebar injection ──

  function createToggleButton() {
    const btn = document.createElement("button");
    btn.id = "asg-sidebar-toggle";
    btn.title = "Toggle Court Map";
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    `;
    btn.addEventListener("click", toggleSidebar);
    document.body.appendChild(btn);
    return btn;
  }

  function createSidebar() {
    const container = document.createElement("div");
    container.id = "asg-sidebar";

    const iframe = document.createElement("iframe");
    iframe.id = "asg-sidebar-frame";
    iframe.src = chrome.runtime.getURL("sidebar.html");
    iframe.setAttribute("allow", "");

    iframe.addEventListener("load", () => {
      sidebarReady = true;
      if (pendingVenues) {
        sendVenuesToSidebar(pendingVenues);
        pendingVenues = null;
      }
    });

    container.appendChild(iframe);
    document.body.appendChild(container);
    sidebarFrame = iframe;
    return container;
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.getElementById("asg-sidebar");
    const toggle = document.getElementById("asg-sidebar-toggle");

    if (sidebarOpen) {
      sidebar.classList.add("open");
      toggle.classList.add("open");
      rescanAndSend();
    } else {
      sidebar.classList.remove("open");
      toggle.classList.remove("open");
    }
  }

  function sendVenuesToSidebar(venues) {
    if (!sidebarFrame || !sidebarReady) {
      pendingVenues = venues;
      return;
    }
    sidebarFrame.contentWindow.postMessage({ type: "asg-venues", venues }, "*");
  }

  function rescanAndSend() {
    const venues = scanPageVenues();
    sendVenuesToSidebar(venues);
  }

  // ── SPA navigation detection ──

  let lastUrl = location.href;

  function watchNavigation() {
    const check = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(rescanAndSend, 800);
      }
    };

    const origPush = history.pushState;
    history.pushState = function () {
      origPush.apply(this, arguments);
      check();
    };
    const origReplace = history.replaceState;
    history.replaceState = function () {
      origReplace.apply(this, arguments);
      check();
    };
    window.addEventListener("popstate", check);
  }

  // ── Init ──

  function init() {
    createToggleButton();
    createSidebar();
    watchNavigation();

    const observer = new MutationObserver(() => {
      if (sidebarOpen) {
        clearTimeout(window._asgRescan);
        window._asgRescan = setTimeout(rescanAndSend, 800);
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
