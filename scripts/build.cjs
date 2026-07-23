const fs = require("fs");
const path = require("path");

const project = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(project, "index.html"), "utf8");
const output = path.join(project, "dist", "server");
const assetFiles = [
  ["assets/ward-0317.png", "image/png"],
  ["assets/hospital-exterior.webp", "image/webp"],
  ["assets/burned-report.webp", "image/webp"],
  ["assets/subject-s017.webp", "image/webp"],
  ["assets/operating-room.webp", "image/webp"],
  ["assets/b3-corridor.webp", "image/webp"],
  ["assets/zero-excavation.webp", "image/webp"],
  ["assets/subject-s048.webp", "image/webp"],
  ["public/og.png", "image/png"]
];
const assetEntries = assetFiles.map(([file, type]) => {
  const route = file === "public/og.png" ? "/og.png" : `/${file}`;
  const data = fs.readFileSync(path.join(project, file)).toString("base64");
  return `${JSON.stringify(route)}:{type:${JSON.stringify(type)},data:Uint8Array.from(atob(${JSON.stringify(data)}),c=>c.charCodeAt(0))}`;
}).join(",");

fs.rmSync(path.join(project, "dist"), { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const worker = `
const page = ${JSON.stringify(html)};
const assets = {${assetEntries}};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets[url.pathname];
    if (asset) {
      return new Response(asset.data, { headers: { "content-type": asset.type, "cache-control": "public, max-age=31536000, immutable" } });
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
