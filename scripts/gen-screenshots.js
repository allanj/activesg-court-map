#!/usr/bin/env node
//
// Captures Chrome Web Store screenshots (1280x800) of the real popup UI,
// composited on a branded background with a caption.
//
// Usage:
//   npm i -D puppeteer && npx puppeteer browsers install chrome
//   node scripts/gen-screenshots.js
//
// Set PROMO_FONT_DIR to a folder with Outfit-Bold.ttf / Outfit-Regular.ttf
// for the branded caption font (falls back to the system sans otherwise).

const fs = require("fs");
const path = require("path");
const os = require("os");
const puppeteer = require("puppeteer");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "images");
const POPUP_URL = "file://" + path.join(ROOT, "popup.html");
const FONT_DIR = process.env.PROMO_FONT_DIR || "";

const W = 1280, H = 800;
const BLUE = "#1a73e8", BLUE_DARK = "#0b3d91";

function fontFace() {
  if (!FONT_DIR) return "";
  const bold = path.join(FONT_DIR, "Outfit-Bold.ttf");
  const reg = path.join(FONT_DIR, "Outfit-Regular.ttf");
  if (!fs.existsSync(bold) || !fs.existsSync(reg)) return "";
  return `
    @font-face { font-family: Outfit; font-weight: 400; src: url('file://${reg}'); }
    @font-face { font-family: Outfit; font-weight: 700; src: url('file://${bold}'); }`;
}

function wrapperHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    ${fontFace()}
    * { margin: 0; box-sizing: border-box; }
    html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
    body {
      font-family: Outfit, -apple-system, "Segoe UI", Roboto, sans-serif;
      background:
        repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 92px),
        repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 92px),
        linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%);
      position: relative;
    }
    .caption { position: absolute; left: 96px; top: 0; height: 100%;
      width: 420px; display: flex; flex-direction: column; justify-content: center; }
    .caption h1 { color: #fff; font-weight: 700; font-size: 50px; line-height: 1.08;
      letter-spacing: -1px; }
    .caption p { color: #fff; opacity: .9; font-weight: 400; font-size: 23px;
      margin-top: 18px; line-height: 1.4; }
    .pin { width: 56px; height: 56px; margin-bottom: 26px; }
    .stage { position: absolute; right: 150px; top: 50%; transform: translateY(-50%); }
    .device { width: 380px; border-radius: 16px; overflow: hidden; background: #fff;
      box-shadow: 0 30px 70px rgba(0,0,0,.35); }
    .bar { height: 34px; background: #f1f3f4; display: flex; align-items: center;
      padding: 0 12px; gap: 7px; border-bottom: 1px solid #e2e4e7; }
    .bar i { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
    iframe { width: 380px; height: 520px; border: 0; display: block; }
  </style></head><body>
    <div class="caption">
      <svg class="pin" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      <h1 id="hl"></h1>
      <p id="sub"></p>
    </div>
    <div class="stage">
      <div class="device">
        <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
        <iframe id="popup" src="${POPUP_URL}"></iframe>
      </div>
    </div>
  </body></html>`;
}

const SCENARIOS = [
  {
    name: "screenshot-1-list.png",
    hl: "Every court, on the map",
    sub: "Browse all ActiveSG badminton venues across Singapore.",
    setup: async () => {},
  },
  {
    name: "screenshot-2-filters.png",
    hl: "Filter by region & type",
    sub: "Narrow to sport centres or school halls in your area.",
    setup: async (frame) => {
      await frame.evaluate(() => {
        const byText = (sel, t) =>
          [...document.querySelectorAll(sel)].find((e) => e.textContent.trim() === t);
        byText(".chip", "School Halls")?.click();
        byText(".chip", "West")?.click();
      });
    },
  },
  {
    name: "screenshot-3-nearest.png",
    hl: "Find the nearest court",
    sub: "Sort venues by distance with one tap.",
    setup: async (frame) => {
      // Deterministically mock geolocation, then trigger Near me.
      await frame.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (ok) =>
          ok({ coords: { latitude: 1.3521, longitude: 103.8198 } });
        document.getElementById("near-me")?.click();
      });
    },
  },
  {
    name: "screenshot-4-map.png",
    hl: "See the whole island",
    sub: "Every venue as a pin on an interactive map.",
    setup: async (frame) => {
      await frame.evaluate(() => {
        [...document.querySelectorAll(".tab")].find((t) => t.dataset.tab === "map")?.click();
      });
      await new Promise((r) => setTimeout(r, 2800)); // let OSM tiles load
    },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const wrapperPath = path.join(os.tmpdir(), "asg-wrapper.html");
  fs.writeFileSync(wrapperPath, wrapperHtml());

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  });

  for (const sc of SCENARIOS) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto("file://" + wrapperPath, { waitUntil: "networkidle2" });
    await page.evaluate(
      (hl, sub) => {
        document.getElementById("hl").textContent = hl;
        document.getElementById("sub").textContent = sub;
      },
      sc.hl,
      sc.sub
    );

    const frame = page
      .frames()
      .find((f) => f.url().startsWith(POPUP_URL.split("#")[0]));
    await frame.waitForSelector("#filters .chip");
    await sleep(400);
    await sc.setup(frame);
    await sleep(900);

    const out = path.join(OUT_DIR, sc.name);
    await page.screenshot({ path: out });
    console.log("wrote " + out);
    await page.close();
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
