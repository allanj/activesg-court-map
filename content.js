(function () {
  "use strict";

  let sidebarOpen = false;
  let sidebarFrame = null;
  let sidebarReady = false;
  let pendingVenues = null;

  // ── Venue name extraction (no database) ──

  const VENUE_KEYWORDS = [
    "school hall", "sport hall", "sports hall",
    "sport centre", "sports centre", "community centre",
    "clubhouse", "tampines hub",
  ];

  function looksLikeVenueName(text) {
    const lower = text.toLowerCase();
    return VENUE_KEYWORDS.some((kw) => lower.includes(kw));
  }

  function getDirectText(el) {
    let t = "";
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) t += n.textContent;
    }
    return t.trim();
  }

  function scanPageVenues() {
    const found = new Map();
    const els = document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,a,span,p,div,[role="heading"],[role="listitem"],[role="option"],li'
    );
    for (const el of els) {
      const text = getDirectText(el);
      if (!text || text.length < 5 || text.length > 120) continue;
      if (looksLikeVenueName(text) && !found.has(text)) {
        found.set(text, { name: text, onPage: true });
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
  }

  function createSidebar() {
    const container = document.createElement("div");
    container.id = "asg-sidebar";

    const iframe = document.createElement("iframe");
    iframe.id = "asg-sidebar-frame";
    iframe.src = chrome.runtime.getURL("sidebar.html");
    iframe.setAttribute("allow", "geolocation");

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
