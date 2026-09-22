// Copies the marketing/info site (../home-lounge) into dist/hub so the same
// Cloudflare Worker serves it at /hub. Runs automatically after `vite build`
// (see the "postbuild" script in package.json).
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("..", "home-lounge");
const dest = path.resolve("dist", "hub");

if (!fs.existsSync(src)) {
  console.warn(`[copy-hub] source not found: ${src} — skipping`);
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, {
  recursive: true,
  // Skip docs / VCS noise; ship only the static site.
  filter: (s) => !/(\.md$|[\\/]\.git)/i.test(s),
});

console.log(`[copy-hub] copied home-lounge -> ${path.relative(process.cwd(), dest)}`);
