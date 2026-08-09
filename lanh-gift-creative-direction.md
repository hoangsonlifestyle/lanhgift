# Lành Gift — TRĂNG TREO Creative Direction

## 1. Creative Direction

Transform the catalogue into a scroll-led moon festival invitation. The site should feel like entering Nguyệt điện: deep red opening, blue moonlit invitation, warm paper interlude, five product movements, a handcrafted mooncake table, corporate gifting stage, partner constellation, and a quiet contact close.

The visual language stays faithful to the source catalogue: deep red, warm cream, gold, bamboo, wood, moonlight blue, jade, pink garden light, and theatrical Asian-contemporary illustration. Motion is quiet and ceremonial: paper reveal, score-line drawing, product image masking, parallax photography, a lightweight Three.js moon-and-particle layer, and small gold light cues.

## 2. User Journey

1. Curiosity: a full-bleed catalogue cover opens like a sealed invitation.
2. Wonder: visitors pass into the blue moonlit branch scene and read the invitation.
3. Dream: the Moon Symphony reframes the product line as musical chapters.
4. Celebration: each gift box appears as a different movement with its own atmosphere.
5. Emotion: mooncakes are shown as handmade details, not inventory.
6. Desire: corporate gifting and partner trust enter naturally near the end.
7. Purchase: contact details close the experience with minimal friction.

## 3. Website Architecture

- `src/app`: App Router shell, SEO metadata, global cinematic style system.
- `src/data/trang-treo.ts`: catalogue-derived source of truth for products, partners, contact, and navigation.
- `src/components`: navigation, grain, eyebrow, and CTA primitives.
- `src/sections`: Hero, Invitation, Symphony, Chapter, Mooncakes, Atelier, Partners, Closing.
- `src/hooks/useLenisScroll.ts`: smooth scroll.
- `src/animations/useStoryAnimations.ts`: GSAP ScrollTrigger choreography.
- `public/images/catalogue`: page visuals from the catalogue.
- `public/images/products`: selected real product photography.

## 4. Scene Breakdown

- Opening Scene: catalogue cover, red textile mood, large TRĂNG TREO typography, “Mở thiệp mời”.
- Introduction Story: moonlit blue branch visual with sentence-led invitation copy.
- Moon Symphony: cream paper stage with animated score path and three emotional movements.
- Product Chapters: Hoa Kim, Phồn Hoa, Ngọc Cảnh Liên Thu, Sắc Hoa, Hồn Việt.
- Mooncake Gallery: handcrafted mooncake image, ingredient/flavour hover states.
- Corporate Gifts: logo customization, material options, delivery promise.
- Partners: animated partner name constellation.
- Contact: minimal purchase gateway using catalogue contact details.

## 5. Animation Plan

- Lenis controls the cinematic scroll pace.
- GSAP reveals story copy and masks product photos on scroll.
- GSAP draws the musical score line as the user moves through the Symphony scene.
- Framer Motion handles menu curtain movement and partner logo/name entrance.
- Three.js renders a soft opening moon field and floating particles with reduced-motion fallback.
- CSS handles lantern-like pulse, grain, soft overlays, and mobile-safe motion fallbacks.

## 6. UI System

- Typography: display serif for ceremonial titles, mono for chapter marks, geometric sans for body copy.
- Palette: catalogue red, candle gold, warm paper, moonlight navy, jade, violet, rose.
- UI: minimal top navigation, round icon menu, quiet sound-suggestion toggle, underline CTAs.
- Layout: full-bleed scenes, no ecommerce cards, product data embedded inside story chapters.

## 7. Component Tree

```text
HomePage
├─ Grain
├─ Navigation
├─ Hero
│  └─ MoonField
├─ Invitation
├─ Symphony
├─ Chapter × 5
├─ Mooncakes
├─ Atelier
├─ Partners
└─ Closing
```
