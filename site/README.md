# Motif website

A static marketing site for Motif: home, features, get started, privacy & data, FAQ, and 404. It has no dependencies and sets no cookies. Fonts are self-hosted, and nothing loads from a third-party host.

```bash
node site/build.mjs   # writes site/dist
node site/serve.mjs   # preview at http://127.0.0.1:4173
```

- `pages/*.html`: page content. The first line is `<!--page {"title", "description", "nav"}-->`.
- `partials/`: the shared layout, header, footer and icon sprite.
- `assets/`: CSS, JS, fonts (copied from the app's @fontsource packages) and images.

Deploy `site/dist` to any static host. Point the host's 404 handling at `404.html`.
