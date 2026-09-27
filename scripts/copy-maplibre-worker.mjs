/**
 * Copies MapLibre GL worker files into public/ so the map can load its
 * web worker from a stable same-origin URL.
 *
 * Why: maplibre-gl resolves its worker relative to the main bundle URL
 * (`./maplibre-gl-worker.mjs`). Under Next.js/Turbopack that file is never
 * emitted next to the app chunks, so the worker fetch 404s and the map
 * fails with "Worker failed to load. Check that the worker URL is correct."
 * Pointing setWorkerUrl() at these self-hosted copies fixes it without
 * any CDN or bundler magic. Runs on postinstall to stay in sync on upgrades.
 *
 * Run: `node scripts/copy-maplibre-worker.mjs`
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const destDir = join(root, "public", "maplibre");

mkdirSync(destDir, { recursive: true });
for (const file of files) {
  const src = join(root, "node_modules", "maplibre-gl", "dist", file);
  const dest = join(destDir, file);
  copyFileSync(src, dest);
  const bytes = statSync(dest).size;
  if (bytes === 0) throw new Error(`Copied empty worker file: ${dest}`);
  console.log(`maplibre worker: ${file} (${bytes} bytes) -> public/maplibre/`);
}
