const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const project = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(project, "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/);
  if (!script) throw new Error("Browser script not found.");
  new Function(script[1]);
  if (html.includes("关联检索<br>") || html.includes("r.next.map")) {
    throw new Error("Visible next-keyword hints are still present.");
  }

  const recordBlock = script[1].match(/const records = \{([\s\S]*?)\n  \};\n  const aliases/);
  const keys = [...recordBlock[1].matchAll(/^    "([^"]+)":\{/gm)];
  if (keys.length !== 25) throw new Error(`Expected 25 records, found ${keys.length}.`);

  const trail = {
    "人和医院": ["医院平面图", "事故报告", "张德升"],
    "医院平面图": ["地下三层"],
    "事故报告": ["陈志强", "15具尸体"],
    "张德升": ["17号实验体", "深度睡眠疗法"],
    "地下三层": ["赵刚", "小周", "B3走廊"],
    "17号实验体": ["李明远", "SS-7", "镜子"],
    "陈志强": ["15具尸体", "手术室", "小周"],
    "李明远": ["1942", "通风管道"],
    "B3走廊": ["监控录像", "1942"],
    "1942": ["零号设施", "真相"],
    "通风管道": ["实验名单", "钥匙", "真相"],
    "15具尸体": ["实验名单", "陈志强"],
    "实验名单": ["钥匙", "真相"],
    "钥匙": ["真相"]
  };
  for (const [record, clues] of Object.entries(trail)) {
    const line = html.split("\n").find((entry) => entry.startsWith(`    "${record}":`));
    if (!line) throw new Error(`Missing trail record: ${record}`);
    for (const clue of clues) {
      if (!line.includes(clue)) throw new Error(`Clue ${clue} is not naturally present in ${record}.`);
    }
  }

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
