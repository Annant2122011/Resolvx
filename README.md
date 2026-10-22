# ResolvX website

A responsive, three-page static website for ResolvX, a Discord-first support ticket system. Built with plain HTML, CSS, and JavaScript, with no build step or package installation required.

The website is a product introduction and documentation experience. It does **not** connect to Discord, access live tickets, execute bot commands, or configure a server.

## Pages

- \`index.html\` — premium product overview, capability highlights, a local interactive ticket-lifecycle explainer, and cross-site search.
- \`features.html\` — feature catalogue, detailed usage guides, command references, implementation caveats, and roadmap distinctions.
- \`wiki.html\` — searchable how-to documentation, setup guidance, lifecycle instructions, recovery limits, a command explorer, and FAQs.
- \`styles.css\` — shared visual system, responsive layouts, accessibility and reduced-motion refinements.
- \`site.js\` — responsive navigation, global search, wiki filtering, command-copy helpers, reading progress, and the local lifecycle explainer.
- \`favicon-local.svg\` — self-contained SVG favicon with the official logo embedded locally, plus \`favicon-local.svg\` as the PNG fallback.
- \`assets/resolvx-logo.png\` — optimized local copy of the official supplied ResolvX logo used in the page header, footer, and CTA artwork.

## Interaction notes

- The **global search** opens with the search button or \`Ctrl+K\` / \`⌘K\`. The wiki also supports in-page search with \`/\`.
- Command copy controls copy a documented slash-command path only. They do not execute the command or supply required options.
- The ticket lifecycle demo changes illustrative text in the browser only. It does not create or edit Discord tickets.
- The dashboard art and sample requests are clearly presented as a static concept, not live usage data.
- The pages deliberately distinguish capabilities documented in the repository from those needing live test-guild acceptance and items still on the roadmap.

## Deploy to GitHub Pages with \`resolvx.int.yt\`

1. Create a repository named **ResolvX** under \`Annant2122011\`. For the simplest setup, make it public.
2. Upload/push the contents of this project to the repository's \`main\` branch. Keep the \`.github/workflows/pages.yml\` file and \`CNAME\` file at the paths shown.
3. In **Settings → Pages**, select **GitHub Actions** as the build and deployment source if it is not selected already.
4. In **Settings → Pages → Custom domain**, enter \`resolvx.int.yt\` and save it. This setting must be made in GitHub; the \`CNAME\` file alone does not configure a custom domain when using a custom Actions workflow.
5. Wait for the **Deploy ResolvX website to GitHub Pages** workflow to complete, then check \`https://resolvx.int.yt\`. If GitHub rejects the domain because ownership verification is unresolved, the existing account-level verification issue must be fixed first or GitHub must clarify an alternative.

## DNS

The existing site configuration is prepared for \`resolvx.int.yt\`. The supplied DNS configuration expects that host to resolve to GitHub Pages using these A records:

- \`185.199.108.153\`
- \`185.199.109.153\`
- \`185.199.110.153\`
- \`185.199.111.153\`

The GitHub Pages domain-verification TXT challenge is managed separately in the DNS provider. Do not remove the existing challenge record while troubleshooting verification. Domain configuration is intentionally separate from the website redesign.

## Notes

The public invite is intentionally omitted until a verified bot invitation URL is supplied. The feature and wiki pages are documentation, not a connected admin dashboard. The bot repository's command examples may still use the \`/supportforge\` root even though the product brand is ResolvX; always use the command names registered by the deployed bot.
