# Deploying semester-hq.com

Since September 2026 the marketing site is served by a Cloudflare Worker
called **semester-hq-site**, with static assets only (no Worker script). It
moved off GitHub Pages because GitHub's terms don't allow Pages to host a
commercial SaaS.

## How a change gets to visitors

1. **Work on a branch.** Every push to a branch other than `main` builds a
   **Preview**, with its own `…workers.dev` address posted on the pull
   request. Previews are marked `noindex`, so they never compete with the real
   site in search.
2. **Merge to `main`.** Cloudflare's build uploads a new **version**, which
   does *not* go live yet.
3. **Promote the version.** Production changes only here:
   ```bash
   npx wrangler versions list
   npx wrangler versions deploy <version-id>@100% -y
   ```
   Or use Workers & Pages → semester-hq-site → Deployments → the version →
   Deploy. Routine changes get promoted once the checks pass. Anything unusual
   waits for Nyla's yes.

Still fetch and rebase before pushing. This repo sometimes picks up commits
from elsewhere.

**Checking a change to how things are served** (headers, `_redirects`, the
config): test a **version URL** (the `Version Preview URL` that
`npx wrangler versions upload` prints), not a branch Preview. Branch
Previews are in open beta (Sept 2026) and ignore `not_found_handling`: a
missing page answers a bare "Not found" instead of `404.html`. Version URLs
serve exactly the way production does.

## Files that control serving

| File | What it does |
|---|---|
| `wrangler.toml` | Worker name, `html_handling = "none"`, `not_found_handling = "404-page"`, and the production route |
| `_headers` | Security headers: HSTS, nosniff, referrer and permissions policy, `X-Frame-Options: DENY`, and the Report-Only CSP |
| `_redirects` | **Generated.** Rewrites (not redirects) for `/`, every `/page` short address, and every `@2x` image. Run `node tools/build-redirects.mjs` after adding, renaming or removing a page or image. The build also runs it |
| `.assetsignore` | Keeps `tools/`, `build-preview.py`, the preview files and repo files off the site |
| `404.html` | Served with a 404 status for any address that isn't a file |

Two Cloudflare behaviours that `_redirects` exists to undo:

- `html_handling = "none"` is set because the default redirects
  `/features.html` to `/features`, and every sitemap entry and canonical tag
  uses the `.html` form. The catch is that `none` also stops `/` from finding
  `index.html`, and stops `/features` from finding `features.html`. The
  rewrites put both back.
- Workers stores file names percent-encoded. It answers
  `dashboard-desktop@2x.webp` with a 307 to `…%402x.webp`. The rewrites
  serve those images directly.

## Checking every URL

`tests/check-urls.mjs` in the app repo (student-dashboard) checks every
sitemap entry, canonical tag, internal link and file on both sites. Each one
must answer 200 with no redirect and the same page as the reference.

## Rolling back

- **A bad deploy:** run `npx wrangler rollback`.
- **The whole hosting move:** production is reached through a Worker route
  (`semester-hq.com/*`). DNS was never changed. Removing the route puts
  traffic back on GitHub Pages while Pages is still on. `www` is redirected
  to the apex by a zone Redirect Rule, which works either way.

## Headers during the changeover

Until GitHub Pages is switched off, the zone's Transform Rule
**"Security headers, site"** also sets the referrer, frame, permissions and
CSP headers, and overrides `_headers`. Keep the two identical. After Pages is
off, the rule gets deleted and `_headers` is the only source.
