# QueryFixr website

A responsive, four-page website frontend for QueryFixr, a Discord-first support ticket system. The pages use plain HTML, CSS, and JavaScript; Vercel and Netlify deployments also expose a small serverless translation proxy.

The website is a product introduction and documentation experience. It does **not** connect to Discord, access live tickets, execute bot commands, or configure a server.

## Pages

- \`index.html\` — premium product overview, capability highlights, a local interactive ticket-lifecycle explainer, and cross-site search.
- \`features.html\` — searchable catalogue of current capability areas, implementation caveats, status labels, and links to detailed wiki guides.
- \`wiki.html\` — long-form guides for setup, ticket workflows, forms, panels, permissions, recovery, scheduling, localization, troubleshooting, commands, roadmap boundaries, and FAQs.
- \`404.html\` — branded, responsive not-found page with direct routes back to the overview, feature library, and help center.
- \`styles.css\` — shared visual system, responsive layouts, keyboard skip-navigation styling, accessibility and reduced-motion refinements.
- `.github/workflows/site-checks.yml` — runs the static site validator for pull requests and pushes to `main`.
- `scripts/validate-site.mjs` — static checks for local links and anchors, duplicate IDs, wiki contents alignment, feature-card counts, accessible names, skip navigation, social preview metadata, mobile layout contracts, branding, and CSS structure.
- `api/translate.js` and `netlify/functions/translate.js` — same-origin translation-proxy adapters for Vercel and Netlify. They validate request size/target languages, apply per-IP limits, fail over across upstreams, and keep optional API keys restricted to the explicitly configured provider.
- `mobile.css` — dedicated mobile layout overrides for navigation, responsive content, touch targets, mobile wiki navigation, and short-screen search.
- \`site.js\` — responsive navigation, multilingual global search, wiki article/FAQ filtering, feature-catalogue filtering, command-copy helpers, reading progress, opt-in website translation, and the local lifecycle explainer.
- The supplied transparent QueryFixr logo PNG is used directly for the browser favicon and Apple touch icon: `https://i.ibb.co/p6VGzczV/HTcx0584-Os-Oe-YAj-O5qp61-x5-PHKm89.png`. The icons and full-size brand artwork are externally hosted.
- The transparent QF mark is used in all page headers, the favicon, Apple touch icon, footer, and CTA. The full-size QueryFixr wordmark is retained for the homepage hero artwork.
- If the external wordmark or hero artwork fails to load, the site displays a local text/gradient fallback instead of leaving broken-image icons.

## Interaction notes

- The **global search** opens with the search button or \`Alt+K\`. The wiki also supports in-page search with \`/\`.
- Command copy controls copy a documented slash-command path only. They do not execute the command or supply required options.
- The ticket lifecycle demo changes illustrative text in the browser only. It does not create or edit Discord tickets.
- The dashboard art and sample requests are clearly presented as a static concept, not live usage data.
- The pages deliberately distinguish current capability areas, features that still need live test-guild acceptance, and roadmap-only work. The feature page is the inventory; the wiki explains behavior and limits.
- The website language selector requests machine translation of public page copy from an external service. The selector defaults to English unless a previously selected translation is restored, so it does not imply that untranslated content has changed. Requests time out after 10 seconds per endpoint attempt and can fall back to a secondary endpoint. It is separate from the bot's server-level message locale and does not connect to Discord or send ticket data. Do not put API secrets in browser-side configuration; this static site cannot keep client-side keys private.

## Hosting and custom domain

The static site is deployed through GitHub Pages. Its custom hostname is configured outside page content in the repository's `CNAME` file, GitHub Pages settings, DNS provider, and any connected Vercel project.

To move to a new QueryFixr-branded hostname, first reserve the replacement hostname and configure its DNS and ownership verification. Then update the GitHub Pages custom-domain setting and `CNAME` file together, and update any Vercel domain aliases. Do not point production at an unverified or guessed hostname; it can make the live site unreachable.

## Notes

The public invite is intentionally omitted until a verified bot invitation URL is supplied. The feature and wiki pages are documentation, not a connected admin dashboard. The bot repository's command examples may still use the \`/supportforge\` root even though the product brand is QueryFixr; always use the command names registered by the deployed bot.


## Search, translation, and brand assets

- Global search builds a same-origin index from homepage sections, feature cards, wiki guides, and individual FAQ answers. Search ranks exact terms first, accepts related synonyms and a bounded one-character typo, shows source categories, and supports keyboard navigation and retry if the index cannot load.
- Wiki and feature filters use the same normalization, synonym, and typo-tolerant scoring model. FAQ answers stay individually filtered even when their parent section matches.
- The supplied transparent QF mark is used directly for the favicon, Apple touch icon, headers, and footer; the full-size QueryFixr artwork is used in the homepage hero and social previews. No competing SVG favicon is shipped.
- The website language selector translates page text and relevant accessibility/placeholder/metadata attributes, protects code and command samples, saves translated strings locally, and tries several translation providers. It caches completed batches and applies a page translation only when the requested batches complete, so a failed request does not silently reset a page that is already translated.
- LibreTranslate mirrors are community-operated and their availability, CORS policy, rate limits, and language models can change. A Google web-translation endpoint is included as an independent best-effort backup, but that endpoint is not a guaranteed public API. A completely guaranteed translation SLA requires a controlled service endpoint or a supported paid API; browser-side code cannot ensure that an external service stays online.
- On Vercel and Netlify the selector tries a same-origin serverless proxy before public mirrors. On static-only hosting, it skips naturally unavailable local routes and attempts the public mirrors directly. Completed translations are cached in the browser. External providers can all be unavailable at once, so no free, public setup can guarantee 100% uptime; the page keeps its current language rather than reverting to English when all providers fail.
- Search scoring checks run in CI via `scripts/test-search.mjs`; structure, link, accessibility, brand, mobile-layout, translation, and search wiring checks run via `scripts/validate-site.mjs`.

