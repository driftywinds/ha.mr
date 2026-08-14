/**
 * build.js — zero-dependency build for self-hosting.
 *
 * Reads HAMR_DOMAIN from the environment or a .env file and generates a
 * deployable copy of the site in dist/:
 *   - config.js is regenerated with the domain pinned in (or left in
 *     runtime mode when no domain is configured)
 *   - CNAME is written with the domain (for GitHub Pages custom domains)
 *
 * With no domain configured the built site still works on any domain,
 * because config.js falls back to the serving domain at runtime.
 *
 * Usage:
 *   node build.js
 *   HAMR_DOMAIN=example.com node build.js
 *   # or put HAMR_DOMAIN=example.com in a .env file, then: node build.js
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "dist");

// ---- Load .env (if present) ----
const env = {};
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
         (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

// Precedence: real environment variable > .env file
const domain = (process.env.HAMR_DOMAIN ?? env.HAMR_DOMAIN ?? "")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .split("/")[0];

if (domain && !/^[a-z0-9.-]+$/.test(domain)) {
  console.error(`Invalid HAMR_DOMAIN "${domain}". Use a bare hostname such as "example.com".`);
  process.exit(1);
}

// ---- Generate dist/ ----
mkdirSync(outDir, { recursive: true });

for (const file of [
  "404.html",
  "alphabets.js",
  "compress.js",
  "index.html",
  "main.js",
  "qrcode.js",
  "standalone.js",
  "README.md",
  "LICENSE"
]) {
  copyFileSync(join(root, file), join(outDir, file));
}

// Pages Functions — the API lives in functions/ at the repo root, which is
// where the Git integration picks it up. Copy it into dist/functions as well
// so `wrangler pages deploy dist` and `wrangler pages dev dist` also work.
const functionsDir = join(root, "functions");
if (existsSync(functionsDir)) {
  cpSync(functionsDir, join(outDir, "functions"), { recursive: true });
}

// Regenerate config.js with the domain pinned in
const configTemplate = readFileSync(join(root, "config.js"), "utf8");
const configSource = configTemplate.replace(
  'const configuredDomain = ""; // replaced by build.js when HAMR_DOMAIN is set',
  `const configuredDomain = ${JSON.stringify(domain)}; // replaced by build.js when HAMR_DOMAIN is set`
);
writeFileSync(join(outDir, "config.js"), configSource);

// CNAME for GitHub Pages custom domains
if (domain) {
  writeFileSync(join(outDir, "CNAME"), domain + "\n");
  console.log(`Built dist/ with HAMR_DOMAIN=${domain}`);
} else {
  console.log("Built dist/ (no HAMR_DOMAIN set — links will use the serving domain at runtime)");
}
