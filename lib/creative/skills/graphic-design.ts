import type { Skill } from './types.ts';
import { visualKinds } from './types.ts';

/** Post-native composition routes the concept stage can pick from and the layout stage can execute. */
export const compositionArchetypes = [
  'full-bleed photograph with the headline set directly into its calm negative space',
  'type and subject interlocked: a giant headline passes behind or in front of the hero subject',
  'tight crop of one object on a saturated brand-color field, with one oversized line of type',
  'magazine-cover treatment: full-bleed image, masthead-scale headline, one small line of supporting copy',
  'typographic poster: one huge statement filling most of the square, artwork as texture or a single cut-out',
  'unexpected scale: a tiny subject in a vast field, or a detail so large it becomes abstract, with one short line',
] as const;

export const graphicDesign: Skill = {
  id: 'graphic-design',
  title: 'Graphic design and composition',
  stages: ['concept', 'layout', 'critique', 'revision'],
  appliesTo: ({ kind }) => !kind || visualKinds.has(kind),
  instructions: `Compose like an art director making a social post or print ad: a single image people see in a feed, not a web page.
- It is a post, not a website. Never use web-page grammar: no navigation bar (logo in one top corner plus a label or links in the other), no eyebrow/kicker above the headline, no hero layout with a text column on one side and a picture on the other, no buttons, no floating UI cards, chips, badges or form fields, no footer rules, breadcrumbs, arrows or link rows, no "Learn more" sections. If it would look normal as the top of a landing page, start again.
- Image-led: the artwork is the stage, usually full-bleed or at least ~60% of the square. Type is integrated with the image: set into its negative space, overlapping it, or interlocking with the subject, never parked in a separate column beside it.
- Choose one composition route and commit to it. Routes: ${compositionArchetypes.join('; ')}.
- Few elements: headline, at most one supporting line, the CTA and a small brand signature. Four text blocks at most; fewer is better.
- Hierarchy: the eye goes to one thing first (the image or the headline), then the other, then the CTA and brand. Make the first element unmistakably dominant through scale (headline at least ~2× the next text size), contrast or isolation.
- Keep at least 64px between any text and the edge of the square, and repeat a small set of spacing values so alignments feel intentional.
- Contrast: every piece of text must clearly separate from what is behind it. Over artwork, place text on calm negative space, or use a confident solid color block that is part of the composition (not a card or a button).
- Restraint: at most 3 colors besides the artwork, at most 2 typefaces, at most 4 text sizes. No decorative shapes unless they carry the idea.
- Everything must be fully inside the 1080×1080 square: no clipped words, no overlapping text. Artwork may bleed off the edges intentionally.`,
};
