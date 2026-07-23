const fs = require("fs");
const path = require("path");

const project = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(project, "index.html"), "utf8");
const ward = fs.readFileSync(path.join(project, "assets", "ward-0317.png")).toString("base64");
const og = fs.readFileSync(path.join(project, "public", "og.png")).toString("base64");
const output = path.join(project, "dist", "server");

fs.rmSync(path.join(project, "dist"), { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const worker = `
const page = ${JSON.stringify(html)};
const ward = Uint8Array.from(atob(${JSON.stringify(ward)}), c => c.charCodeAt(0));
const og = Uint8Array.from(atob(${JSON.stringify(og)}), c => c.charCodeAt(0));

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/assets/ward-0317.png") {
      return new Response(ward, { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (url.pathname === "/og.png") {
      return new Response(og, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    }
    if (url.pathname !== "/" && url.pathname !== "/index.html") {
      return new Response("Archive record not found.", { status: 404 });
    }
    return new Response(page.replaceAll("__ORIGIN__", url.origin), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
        "x-content-type-options": "nosniff",
        "referrer-policy": "same-origin"
      }
    });
  }
};
`;

fs.writeFileSync(path.join(output, "index.js"), worker);
console.log("Built deployable worker at dist/server/index.js");
