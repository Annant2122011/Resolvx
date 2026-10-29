# QueryFixr website audit and remediation

**Audit date:** 29 October 2026  
**Branch:** `queryfixr/site-audit-polish-2026-10-29`

## Scope

Reviewed the three main HTML pages, shared JavaScript and stylesheets, mobile overrides, translation proxy adapters, validation scripts, hosting configuration, and site documentation. This was a source-level audit. A live visual run across real desktop/mobile browsers and screen readers still requires deployment/browser testing.

## Findings fixed in this update

| Severity | Finding | Remediation |
|---|---|---|
| High | Keyboard users had no direct way to bypass the repeated header/navigation and jump to the page content. | Added a visible-on-focus **Skip to main content** link and a stable main landmark to the Overview, Features, Wiki, and new 404 page. Added focus, mobile, safe-area, and reduced-motion styling. |
| High | The language selector used `navigator.language` as its initial selection even though it did not translate the page automatically. A French-speaking browser, for example, could show French selected while the page remained English. | The selector now defaults to English until a saved website translation is restored. The actual translation action remains explicit. |
| Medium | Unknown or mistyped URLs did not have a dedicated branded recovery page. | Added a responsive `404.html` with direct routes back to the Overview, Features, and Wiki. It is marked `noindex, follow`. |
| Medium | Pages had Open Graph titles/descriptions but lacked an Open Graph image and large-image social-card metadata. | Added page-specific share titles/descriptions and QueryFixr artwork metadata on the main pages and the 404 page. |
| Medium | The validator did not include a 404 page or enforce skip navigation, social-card metadata, or the language-selector default. | Expanded `scripts/validate-site.mjs` to check the added page and guard the newly fixed behavior against regressions. |
| Low | The README described a local SVG logo wrapper that is not part of the current implementation and counted only three pages. | Updated the documentation to describe the actual direct PNG artwork usage, the 404 page, and the added accessibility/SEO checks. |

## Remaining decisions and dependencies

1. **Custom hostname:** The existing `CNAME` still names a hostname carrying the previous product name. It was not changed in this code update because the replacement QueryFixr hostname has not been provided and DNS/ownership cannot be verified from a repository edit. A guessed hostname could disconnect the GitHub Pages site. Once the replacement is reserved and verified, update DNS, the GitHub Pages custom-domain setting, `CNAME`, and any connected Vercel aliases together.
2. **Canonical URL, sitemap, and robots policy:** These should be added after the primary production hostname is confirmed. Publishing canonical tags or a sitemap for an unverified hostname can create duplicate-indexing or SEO problems.
3. **Externally hosted artwork and fonts:** The current artwork and font delivery still depend on third-party hosts. Rendered logo/hero images have JavaScript fallbacks, but favicon and social-preview fetches cannot use the same DOM fallback. Self-hosting optimized assets would remove this dependency; it requires the source assets to be available for packaging.
4. **Translation provider uptime:** Website translation sends public page copy to external providers and relies on their availability, CORS rules, rate limits, and language models. The page reports failure and preserves the existing page language rather than silently applying partial translations. A guaranteed translation SLA needs a controlled provider.
5. **Bot invitation and command root:** The public invite remains intentionally absent until a verified Discord invite URL is supplied. The Wiki's command examples follow the command root documented by the bot source; changing that command root on the website alone would make the instructions inaccurate if the deployed bot has not registered the replacement commands.

## Verification status

The repository's GitHub Actions workflow runs JavaScript syntax checks, static link/anchor/accessibility/branding checks, performance checks, search tests, translation-proxy tests, and client-translation tests for pull requests. This branch extends that workflow's static regression coverage. The pull-request workflow result should be checked before merging; no statement of a passing CI run should be inferred from the code edits alone.
