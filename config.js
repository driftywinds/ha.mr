// config.js — the domain used when generating compressed links.
//
// Zero configuration: by default the site uses whatever domain it is
// currently served from (window.location.host), so it works on any domain
// with no setup at all.
//
// To pin a specific domain — e.g. the site is served from an internal
// address but links should point at your public domain — put it in a
// .env file:
//
//   HAMR_DOMAIN=example.com
//
// and run `node build.js`. The build rewrites this file with the domain
// baked in and writes a CNAME file for GitHub Pages.

const configuredDomain = ""; // replaced by build.js when HAMR_DOMAIN is set

const isBrowser = typeof window !== "undefined";

export const siteDomain = configuredDomain || (isBrowser ? window.location.host : "ha.mr");
export const siteProtocol = configuredDomain
  ? "https:"
  : isBrowser && window.location.protocol === "http:"
    ? "http:"
    : "https:";
