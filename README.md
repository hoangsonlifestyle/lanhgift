# Lành Gift — Trăng Treo

An immersive cinematic storytelling website for the Lành Gift 2026 Mid-Autumn collection, built from the supplied catalogue and product photography.

## Run locally

```bash
nvm use
npm install
npm run dev
```

Open `http://localhost:3000`.

Recommended runtime: Node 22.x.

## Production

```bash
npm run build
npm run start
```

The app uses Next.js App Router, TypeScript, Tailwind CSS, GSAP ScrollTrigger, Framer Motion, Three.js, Lenis smooth scrolling, and the real catalogue assets under `public/images`.

## Structure

- `src/app`: App Router entry, metadata, global styles.
- `src/data`: Catalogue-derived product, partner, and contact data.
- `src/components`: Reusable navigation and UI primitives.
- `src/sections`: Cinematic story scenes.
- `src/hooks`: Smooth scroll setup.
- `src/animations`: ScrollTrigger choreography.
- `public/images/catalogue`: Extracted catalogue pages.
- `public/images/products`: Supplied product photography.

## Validation notes

- Package lock is aligned on Next.js 16.3.0.
- `npm audit --omit=dev` reports zero vulnerabilities.
- Static source transpilation and public asset-reference checks pass.
