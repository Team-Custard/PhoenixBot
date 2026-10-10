// Bundles the dashboard into dist/ with esbuild.
//   npm run build          one production build
//   npm run build -- --watch   rebuild on changes while developing
import { build, context } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(dir, "dist");
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: { app: path.join(dir, "src/main.jsx") },
  bundle: true,
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  format: "esm",
  target: ["es2020", "chrome100", "firefox100", "safari15"],
  jsx: "automatic",
  loader: { ".js": "jsx" },
  outdir: path.join(dist, "assets"),
  entryNames: watch ? "[name]" : "[name]-[hash]",
  metafile: true,
  define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
  // Lets the build find React somewhere else (e.g. a shared tools folder) if needed.
  nodePaths: [path.join(dir, "node_modules"), ...(process.env.DASHBOARD_NODE_PATH?.split(path.delimiter) ?? [])],
  logLevel: "info",
  // Ignore the bot's tsconfig.json in the folder above.
  tsconfigRaw: {},
};

async function writeIndex(metafile) {
  const outputs = Object.keys(metafile.outputs).map((file) => path.relative(path.join(dist, "assets"), file));
  const js = outputs.find((f) => f.endsWith(".js"));
  const css = outputs.find((f) => f.endsWith(".css"));
  const template = await readFile(path.join(dir, "src/index.html"), "utf8");
  const html = template
    .replace("<!--CSS-->", css ? `<link rel="stylesheet" href="/dash/assets/${css}">` : "")
    .replace("<!--JS-->", `<script type="module" src="/dash/assets/${js}"></script>`);
  await writeFile(path.join(dist, "index.html"), html);
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });

if (watch) {
  const ctx = await context({
    ...options,
    plugins: [{ name: "index", setup: (b) => b.onEnd((result) => result.metafile && writeIndex(result.metafile)) }],
  });
  await ctx.watch();
  console.log("Watching for changes...");
}
else {
  const result = await build(options);
  await writeIndex(result.metafile);
  const files = await readdir(path.join(dist, "assets"));
  const hash = createHash("sha256").update(files.join()).digest("hex").slice(0, 8);
  console.log(`Built dashboard (${files.join(", ")}) ${hash}`);
}
