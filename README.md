# ha.mr
Compresses links and optimizes QR codes entirely in the browser, without a back-end database.

## How
1. Common parts of the link (e.g. protocol, `www.` prefix, `index.html`) are manually detected and reduced to individual bits. If present, the port is encoded as a raw numeric value.
2. Second-level and top-level domains are matched against a Huffman-coded dictionary of the most common websites and TLDs.
3. The rest of the link is split into parts, and each segment is either fitted to a predefined character set, or Huffman coded.
4. For links, the output is encoded in the full character set of a URL. (I've been informed that square brackets `[]` are not supposed to be a part of this set, but it's too late to change that now.)
5. For QR codes, the output uses the alphanumeric character set to remove overhead compared to other QR code generators.

## Self-hosting
The site is fully static and works on any domain with zero configuration:
generated links automatically use the domain the site is served from, so
just drop the files on any static host (GitHub Pages, Netlify, nginx, etc.).

To pin a specific domain — e.g. the site is served from an internal address
but links should point at your public domain — set `HAMR_DOMAIN` either as
an environment variable or in a `.env` file, then build:

```bash
# via environment variable
HAMR_DOMAIN=example.com node build.js

# or via a .env file
echo "HAMR_DOMAIN=example.com" > .env
node build.js
```

`build.js` regenerates `config.js` with the domain baked in, writes `CNAME`
(for GitHub Pages custom domains), and outputs the deployable site to `dist/`.
Deploy the contents of `dist/` (or the repo root, if no domain is pinned).

### Hosting notes
- Compressed text links use URL fragments (`example.com#<payload>`), which
  any static host serves without configuration.
- QR code links use the URL path (`example.com/<payload>`), so the host must
  serve `index.html` for unknown paths. GitHub Pages does this automatically
  via the included `404.html`; for other hosts, configure a fallback (e.g.
  `try_files $uri /index.html;` in nginx).

### Cloudflare Pages
No special configuration is needed — Cloudflare Pages serves the included
`404.html` (a copy of `index.html`) for unknown paths, so QR-code links work
out of the box. Setup:

1. Push this repository to GitHub or GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git**, and pick the repo.
3. Set the build configuration:
   - Build command: `node build.js`
   - Build output directory: `dist`
4. (Optional) Add the `HAMR_DOMAIN` environment variable in the project
   settings if you want links pinned to a specific domain (e.g. for Preview
   deployments that should still produce production links).
5. Deploy. The site works on your `*.pages.dev` URL and any custom domain
   you attach, since links use the serving domain by default.

Alternative without Git: `npm run build && npx wrangler pages deploy dist --project-name=hamr`.

## CLI
`node standalone.js <link> [ascii|qr|emoji]` compresses a link, and
decompresses an existing `<domain>#<payload>` or `<domain>/<payload>` link
back to the original. Uses the `HAMR_DOMAIN` environment variable
(default `ha.mr`).

## Acknowledgements
- https://www.npmjs.com/package/qrcode
- https://github.com/smythp/reddit_links_dataset
- https://github.com/ada-url/url-dataset
