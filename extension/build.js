#!/usr/bin/env node

// Builds the extension popup bundle and writes two distributables:
// - extension/dist/chrome
// - extension/dist/firefox
//
// Requirements: run from repo root with Node 18+ installed.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXT_DIR = __dirname;
const DIST_DIR = path.join(EXT_DIR, "dist");

async function readJson(p) {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

async function ensureEmptyDir(p) {
  await fs.rm(p, { recursive: true, force: true });
  await fs.mkdir(p, { recursive: true });
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) await copyDir(src, dst);
    else await fs.copyFile(src, dst);
  }
}

async function buildOne(outDir) {
  await build({
    root: EXT_DIR,
    configFile: false,
    base: "./",
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: false,
      cssCodeSplit: false,
      rollupOptions: {
        input: path.join(EXT_DIR, "popup.html"),
        output: {
          entryFileNames: "popup.js",
          chunkFileNames: "chunks/[name].js",
          assetFileNames: "[name][extname]",
          inlineDynamicImports: true,
          manualChunks: undefined,
        },
      },
    },
  });

  // Vite will copy popup.html + popup.css (referenced in HTML) into outDir.
  await copyDir(path.join(EXT_DIR, "icons"), path.join(outDir, "icons"));
}

function getTarget() {
  const arg = process.argv.slice(2).find((a) => a.startsWith("--target="));
  const value = arg ? arg.split("=")[1] : "all";
  if (value === "all" || value === "chrome" || value === "firefox") return value;
  throw new Error(`Unknown --target=${value} (expected all|chrome|firefox)`);
}

async function writeManifests() {
  const target = getTarget();
  const baseManifest = await readJson(path.join(EXT_DIR, "manifest.json"));

  const chromeDir = path.join(DIST_DIR, "chrome");
  const firefoxDir = path.join(DIST_DIR, "firefox");

  if (target === "all" || target === "chrome") {
    await ensureEmptyDir(chromeDir);
    await buildOne(chromeDir);
    await fs.writeFile(path.join(chromeDir, "manifest.json"), JSON.stringify(baseManifest, null, 2));
  }

  if (target === "all" || target === "firefox") {
    await ensureEmptyDir(firefoxDir);
    await buildOne(firefoxDir);

    const firefoxManifest = {
      ...baseManifest,
      browser_specific_settings: {
        gecko: {
          id: "napkinmath@example.com",
          strict_min_version: "109.0",
        },
      },
    };
    await fs.writeFile(path.join(firefoxDir, "manifest.json"), JSON.stringify(firefoxManifest, null, 2));
  }
}

writeManifests().catch((err) => {
  console.error(err);
  process.exit(1);
});
