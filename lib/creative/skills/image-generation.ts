import type { Skill } from './types.ts';

export const imageGeneration: Skill = {
  id: 'image-generation',
  title: 'Art direction for image generation',
  stages: ['concept', 'layout', 'artwork'],
  instructions: `Brief the image model like a photographer or illustrator, in concrete visual language (not keyword soup).
- Structure the image prompt as: medium and style → hero subject and what it is doing → setting and props → composition and camera (angle, lens feel, crop) → lighting (direction, quality, time of day) → color and materials → mood. 60–140 words.
- State the composition explicitly and match it to the layout: where the subject sits (e.g. "subject in the lower right third") and where clean negative space must stay empty for typography (e.g. "calm, empty upper-left area of plain backdrop").
- Choose one coherent medium: editorial studio photography, natural-light lifestyle photography, macro still life, flat-lay, risograph-style illustration, paper collage or gouache illustration — whichever suits the brand. Name it once. Avoid 3D renders unless the brand itself is 3D.
- Show a concrete, recognisable subject (a person, a place, an object, a moment) tied to the idea. No abstract translucent shapes, swirls or sculptures standing in for an idea.
- Default to a full-bleed scene that fills the square edge to edge, not an object floating in an empty box.
- Be specific: "linen napkin, morning side light, soft shadow at 45°" beats "beautiful, high quality, 8k, masterpiece". Avoid empty quality boosters and artist names.
- Steer away from the generic AI look: no glossy plastic skin, no impossible symmetric perfection, no floating random objects, no purple-blue neon glow unless the brand calls for it, no busy bokeh soup. Ask for natural imperfection, real materials and believable light.
- Use the brand palette as color direction for backdrop, props or light, described as named colors.
- The image must contain no text, letters, numbers, logos, labels, signage, watermarks or interface elements — all words are set separately in HTML.
- Do not describe an exact branded product you have not seen; depict the category, material, use or setting instead.`,
};
