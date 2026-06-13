/**
 * Generates PWA icons as simple blue squares with a 💧 emoji.
 * Run: node scripts/generate-icons.js
 * Requires: npm install canvas (or skip and use a free icon generator)
 *
 * FREE ALTERNATIVE: https://maskable.app/editor — paste the SVG below, export all sizes
 *
 * SVG source for your icon (use at maskable.app):
 * <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
 *   <rect width="512" height="512" fill="#0f4c81" rx="80"/>
 *   <text x="256" y="320" font-size="280" text-anchor="middle">💧</text>
 * </svg>
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = path.join(process.cwd(), "public/icons");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

SIZES.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0f4c81";
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Emoji
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💧", size / 2, size / 2 + size * 0.04);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(OUT_DIR, `icon-${size}x${size}.png`), buffer);
  console.log(`✓ icon-${size}x${size}.png`);
});

console.log("Icons generated in public/icons/");
