import type { Skill } from './types.ts';

export const brandConsistency: Skill = {
  id: 'brand-consistency',
  title: 'Brand consistency',
  stages: ['concept', 'copy', 'layout', 'artwork', 'critique', 'revision'],
  instructions: `Represent the brand accurately, as its own design team would.
- Treat the supplied brand colors as the core palette: use the primary brand color with intent (a field, the CTA, the headline) rather than sprinkling it everywhere. Derive tints, shades and one neutral from it; do not introduce unrelated saturated colors.
- Match the visual temperature to the brand voice and industry: calm and spacious for premium or wellness; dense and energetic for retail promotions; precise and structured for professional services; warm and tactile for food and craft.
- Use research findings and evidence (if supplied) about what the brand actually sells, who it serves and how it speaks. Prefer specific observed details over generic category imagery.
- Never invent products, features, packaging, logos or claims. When the exact product appearance is unknown, depict the context, material, ingredient, moment or outcome instead of a fabricated product close-up.
- The brand name appears as a clear but secondary signature — never larger than the headline.
- Keep consistency across a set of creatives: same palette logic and type voice, varied composition and idea.`,
};
