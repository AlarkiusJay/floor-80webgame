// Auto-generates dist/sitemap.xml at build time:
//  - the game root (/)
//  - every .html page in ../home-lounge, served under /hub
// Runs after `vite build` (see the "postbuild" script in package.json), so
// adding a hub page automatically adds it to the sitemap. No hand-editing.
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.fl80r.party";
const hubDir = path.resolve("..", "home-lounge");
const outDir = path.resolve("dist");

const fmt = (d) => new Date(d).toISOString().slice(0, 10);

const urls = [
  { loc: `${BASE}/`, changefreq: "monthly", priority: "1.0", lastmod: new Date() },
];

if (fs.existsSync(hubDir)) {
  for (const entry of fs.readdirSync(hubDir).sort()) {
    if (!entry.toLowerCase().endsWith(".html")) continue;
    const stat = fs.statSync(path.join(hubDir, entry));
    const isIndex = entry === "index.html";
    urls.push({
      loc: isIndex ? `${BASE}/hub` : `${BASE}/hub/${entry}`,
      changefreq: entry === "contributors.html" ? "weekly" : "monthly",
      priority: isIndex ? "0.8" : "0.5",
      lastmod: stat.mtime,
    });
  }
}

const body = urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${fmt(u.lastmod)}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml);
console.log(`[gen-sitemap] wrote dist/sitemap.xml with ${urls.length} url(s)`);
