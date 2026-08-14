/**
 * functions/api/compress.js — ha.mr public API.
 *
 * Compresses a link exactly like the client-side site does and returns the
 * resulting link. Runs as a Cloudflare Pages Function on the same domain as
 * the site (no extra service, free tier).
 *
 *   GET  /api/compress?url=<link>&alphabet=ascii|qr|emoji&format=text|json
 *   POST /api/compress   (form body url=... or JSON body {"url": "..."})
 *
 * Plain text by default; JSON when format=json or the request sends
 * `Accept: application/json`. Generated links use the host the request came
 * in on — or HAMR_DOMAIN if set — mirroring how the site's config.js picks
 * the domain for client-side links.
 */
import { compress } from "../../compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji
} from "../../alphabets.js";

const ALPHABETS = {
  ascii: outputAlphabetASCII,
  qr: outputAlphabetQR,
  emoji: outputAlphabetEmoji
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function respond (body, { status = 200, contentType = "text/plain; charset=utf-8" } = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": contentType }
  });
}

function errorResponse (message, format, status = 400) {
  if (format === "json") {
    return respond(JSON.stringify({ error: message }) + "\n", {
      status,
      contentType: "application/json"
    });
  }
  return respond(message + "\n", { status });
}

/**
 * Domain used in generated links. Matches config.js: HAMR_DOMAIN wins if
 * set (baked in at build for the static site, read from the environment
 * here), otherwise the host the request arrived on.
 */
function linkDomain (context, requestUrl) {
  const configured = (context.env.HAMR_DOMAIN || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  return configured || requestUrl.host;
}

/** Build the full compressed link, matching the format the web UI produces. */
function buildLink (input, alphabetName, domain) {
  const output = compress(input, ALPHABETS[alphabetName]);
  if (alphabetName === "qr") {
    // The site uppercases the protocol and host for QR links.
    return `HTTPS://${domain.toUpperCase()}/${output}`;
  }
  return `https://${domain}#${output}`;
}

async function handle (context, requestUrl, params) {
  const formatParam = params.get("format");
  const accept = context.request.headers.get("Accept") || "";
  const format = formatParam
    ? formatParam.toLowerCase()
    : accept.includes("application/json") ? "json" : "text";

  if (!["text", "json"].includes(format)) {
    return errorResponse(`Unknown format "${format}". Select one of: text, json`, "text");
  }

  const input = params.get("url")?.trim();
  if (!input) {
    return errorResponse("Missing required parameter: url", format);
  }

  const alphabetName = (params.get("alphabet") || "ascii").toLowerCase();
  if (!(alphabetName in ALPHABETS)) {
    return errorResponse(
      `Unknown alphabet "${alphabetName}". Select one of: ascii, qr, emoji`,
      format
    );
  }

  const domain = linkDomain(context, requestUrl);

  let link;
  try {
    link = buildLink(input, alphabetName, domain);
  } catch (e) {
    return errorResponse(`Invalid link: ${e.message}`, format);
  }

  if (format === "json") {
    return respond(JSON.stringify({ input, output: link, alphabet: alphabetName, domain }) + "\n", {
      contentType: "application/json"
    });
  }
  return respond(link + "\n");
}

/**
 * Collect parameters from the query string, and for POST also merge in
 * url/alphabet/format from the form or JSON body so special characters in
 * links don't have to be URL-encoded.
 */
async function getParams (context) {
  const requestUrl = new URL(context.request.url);
  const params = new URLSearchParams(requestUrl.searchParams);
  if (context.request.method !== "POST") {
    return { requestUrl, params };
  }
  const contentType = context.request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const body = await context.request.json().catch(() => null);
    if (body && typeof body === "object") {
      for (const key of ["url", "alphabet", "format"]) {
        if (body[key] != null) params.set(key, String(body[key]));
      }
    }
  } else {
    const form = await context.request.formData().catch(() => null);
    if (form) {
      for (const key of ["url", "alphabet", "format"]) {
        const value = form.get(key);
        if (value != null) params.set(key, String(value));
      }
    }
  }
  return { requestUrl, params };
}

export async function onRequestGet (context) {
  const { requestUrl, params } = await getParams(context);
  return handle(context, requestUrl, params);
}

export async function onRequestPost (context) {
  const { requestUrl, params } = await getParams(context);
  return handle(context, requestUrl, params);
}

export function onRequestOptions () {
  return new Response(null, { status: 204, headers: CORS });
}
