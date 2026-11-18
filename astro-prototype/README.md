# Zero2Root Astro / Starlight prototype

This folder is an isolated framework prototype. It does not replace the current MkDocs site or change production routing.

## Stack

- Astro 7
- Starlight 0.43
- React 19 for the interactive explorer
- Existing Zero2Root homepage index JSON as the content source
- Animated SVG field atlas with layered domain, subdomain and resource navigation

## Experience

- Explore the six top-level collections and their groups.
- Drill into the ten Tools & Automation guides.
- Search the indexed 67-page Zero2Root library.
- Open a contextual detail view for each indexed page.
- Switch to an assessment-lifecycle navigator.
- Inspect curated cross-collection relationships.
- Browse all indexed pages in a filterable directory.

Only the ten Tools & Automation guides are migrated into Starlight in this prototype. Other indexed pages link back to the existing MkDocs preview so the prototype does not pretend those pages have already been migrated.

## Local development

Requires Node.js 22.23.5 or newer in the Node 22 line.

```bash
cd astro-prototype
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The Netlify build script routes only the `prototype/astro-knowledge-explorer` branch to Astro. All other branches, including `main` and the existing mobile UX branch, continue to use the current MkDocs build.

## Known prototype limitations

- The index data is still the existing curated JSON, not yet a normalized content graph.
- Relationship edges are curated examples, not inferred or exhaustive.
- The remaining 56 pages are not copied to Starlight yet; they open in the existing MkDocs preview.
- There is no generated npm lockfile yet because this environment cannot access the npm registry. Netlify resolves the exact direct dependency versions from package.json during the preview build.
- Accessibility and actual device behaviour still require browser/device verification after the preview deploy.

## Safety

This is a prototype branch and the home page uses `noindex,nofollow`. Do not merge it into production until content parity, redirects, search, accessibility, mobile behaviour, and build reproducibility are reviewed.
