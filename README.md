# ResolveX website

A responsive, two-page static website for ResolveX, an AI-powered Discord support bot project. Built with plain HTML, CSS, and JavaScript, with no build step or package installation required.

## Pages

- `index.html` — home page and product introduction
- `features.html` — feature overview and FAQs

## Deploy to GitHub Pages with `resolvx.int.yt`

1. Create a repository named **ResolveX** under `Annant2122011`. For the simplest setup, make it public.
2. Upload/push the contents of this project to the repository's `main` branch. Keep the `.github/workflows/pages.yml` file and `CNAME` file at the paths shown.
3. In **Settings → Pages**, select **GitHub Actions** as the build and deployment source if it is not selected already.
4. In **Settings → Pages → Custom domain**, enter `resolvx.int.yt` and save it. This setting must be made in GitHub; the `CNAME` file alone does not configure a custom domain when using a custom Actions workflow.
5. Wait for the **Deploy ResolveX website to GitHub Pages** workflow to complete, then check `https://resolvx.int.yt`. If GitHub rejects the domain because ownership verification is unresolved, the existing account-level verification issue must be fixed first or GitHub must clarify an alternative.

## DNS

The site is prepared for `resolvx.int.yt`. The supplied DNS configuration expects that host to resolve to GitHub Pages using these A records:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

The GitHub Pages domain-verification TXT challenge is managed separately in the DNS provider. Do not remove the existing challenge record while troubleshooting verification.

## Notes

This is an initial project website, not the Discord bot itself. The feature page explicitly distinguishes the product vision from features that are not yet available. The Discord invite is intentionally omitted until a real bot invite URL exists.
