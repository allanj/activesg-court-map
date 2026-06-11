#!/usr/bin/env node
//
// Regenerates the Chrome Web Store promo images into docs/images/:
//   promo-tile-440x280.png      (small promo tile)
//   promo-marquee-1400x560.png  (marquee promo)
//
// Usage:  npm i -D @resvg/resvg-js && node scripts/gen-promo.js
//
// Fonts: uses the Outfit family if available, otherwise falls back to any
// installed system sans. Point PROMO_FONT_DIR at a folder of .ttf files to
// override (expects Outfit-Bold.ttf / Outfit-Regular.ttf).

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const OUT_DIR = path.join(__dirname, "..", "docs", "images");
const FONT_DIR = process.env.PROMO_FONT_DIR || "";
const fontFiles = FONT_DIR
  ? ["Outfit-Bold.ttf", "Outfit-Regular.ttf"]
      .map((f) => path.join(FONT_DIR, f))
      .filter((p) => fs.existsSync(p))
  : [];

const BLUE = "#1a73e8";
const BLUE_DARK = "#0b3d91";

// Map-pin glyph from the extension, drawn white. Anchored at the bottom tip.
function pin(cx, cy, scale, opacity = 1) {
  const t = `translate(${cx - 12 * scale}, ${cy - 23 * scale}) scale(${scale})`;
  return `
    <g transform="${t}" opacity="${opacity}">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#ffffff"/>
      <circle cx="12" cy="10" r="3.2" fill="${BLUE}"/>
    </g>`;
}

// Faint decorative map grid.
function backdrop(w, h) {
  let lines = "";
  const step = Math.round(w / 14);
  for (let x = 0; x <= w; x += step) {
    lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>`;
  }
  for (let y = 0; y <= h; y += step) {
    lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>`;
  }
  return lines;
}

function defs() {
  return `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BLUE}"/>
        <stop offset="1" stop-color="${BLUE_DARK}"/>
      </linearGradient>
      <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.28"/>
      </filter>
    </defs>`;
}

function svgTile() {
  const w = 440, h = 280;
  const pins = [
    pin(w * 0.78, h * 0.30, 1.1, 0.18),
    pin(w * 0.90, h * 0.62, 0.8, 0.14),
    pin(w * 0.66, h * 0.78, 0.7, 0.12),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs()}
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${backdrop(w, h)}${pins}
    <g filter="url(#sh)">${pin(78, 132, 4.2)}</g>
    <text x="146" y="118" font-family="Outfit" font-weight="700" font-size="34" fill="#ffffff">ActiveSG</text>
    <text x="146" y="156" font-family="Outfit" font-weight="700" font-size="34" fill="#ffffff">Court Map</text>
    <text x="148" y="190" font-family="Outfit" font-weight="400" font-size="15" fill="#ffffff" fill-opacity="0.9">Find badminton courts by location</text>
  </svg>`;
}

function svgMarquee() {
  const w = 1400, h = 560;
  const pins = [
    pin(w * 0.70, h * 0.26, 2.4, 0.16),
    pin(w * 0.82, h * 0.55, 1.9, 0.13),
    pin(w * 0.62, h * 0.70, 1.5, 0.12),
    pin(w * 0.90, h * 0.34, 1.3, 0.10),
    pin(w * 0.76, h * 0.84, 1.2, 0.10),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs()}
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${backdrop(w, h)}${pins}
    <g filter="url(#sh)">${pin(150, 300, 9.0)}</g>
    <text x="290" y="250" font-family="Outfit" font-weight="700" font-size="92" fill="#ffffff">ActiveSG Court Map</text>
    <text x="294" y="322" font-family="Outfit" font-weight="400" font-size="31" fill="#ffffff" fill-opacity="0.92">See where each court is, filter by region, find the nearest.</text>
    <g transform="translate(294, 372)">
      <rect width="250" height="46" rx="23" fill="#ffffff" fill-opacity="0.16"/>
      <text x="125" y="30" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="19" fill="#ffffff">Singapore · ActiveSG</text>
    </g>
  </svg>`;
}

function render(svg, name, w) {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: w },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: "Outfit" },
  });
  const out = path.join(OUT_DIR, name);
  fs.writeFileSync(out, r.render().asPng());
  console.log(`wrote ${out}`);
}

render(svgTile(), "promo-tile-440x280.png", 440);
render(svgMarquee(), "promo-marquee-1400x560.png", 1400);
