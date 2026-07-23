const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const project = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(project, "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/);
  if (!script) throw new Error("Browser script not found.");
  new Function(script[1]);

  const recordBlock = script[1].match(/const records = \{([\s\S]*?)\n  \};\n  const aliases/);
  const keys = [...recordBlock[1].matchAll(/^    "([^"]+)":\{/gm)];
  if (keys.length !== 25) throw new Error(`Expected 25 records, found ${keys.length}.`);

  const localImages = [...new Set([...html.matchAll(/(?:src=|image:)"(assets\/[^"]+)"/g)].map((match) => match[1]))];
  for (const image of localImages) {
    if (!fs.existsSync(path.join(project, image))) throw new Error(`Missing image: ${image}`);
  }

  const worker = (await import(pathToFileURL(path.join(project, "dist", "server", "index.js")).href)).default;
  const pageResponse = await worker.fetch(new Request("https://archive.example/"));
  if (pageResponse.status !== 200 || !pageResponse.headers.get("content-type").includes("text/html")) {
    throw new Error("Worker did not return the site.");
  }
  for (const image of localImages) {
    const response = await worker.fetch(new Request(`https://archive.example/${image}`));
    if (response.status !== 200 || !response.headers.get("content-type").startsWith("image/")) {
      throw new Error(`Worker did not return image: ${image}`);
    }
  }
  console.log(`Validated 25 records and ${localImages.length} referenced evidence images.`);
})();
