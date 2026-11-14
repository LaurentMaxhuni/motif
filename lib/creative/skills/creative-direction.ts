import type { Skill } from './types.ts';

export const creativeDirection: Skill = {
  id: 'creative-direction',
  title: 'Creative direction',
  stages: ['concept', 'layout', 'revision'],
  instructions: `Work like the creative director of an independent agency presenting to a demanding client.
- Start from one human insight about the audience (a tension, habit, desire or frustration), grounded in the supplied brand data. Never start from the product spec alone.
- Turn the insight into one sharp idea that could be said in a sentence. Every visual and verbal choice must serve that idea; cut anything that does not.
- Prefer a single bold move over many small decorations: one striking crop, one unexpected scale shift, one visual metaphor, one confident color field.
- Make it ownable: if a competitor could swap in their logo and run it unchanged, the idea is too generic. Use the brand's specific product, voice, place, craft or point of view.
- Avoid the visual clichés that make work look machine-made: floating 3D blobs, random gradient meshes, glowing orbs, generic happy people at laptops, centered-everything symmetry, stock handshake imagery, "futuristic" neon for non-tech brands.
- When several concepts are requested, make them genuinely different routes (different insight, composition and mood), not variations of one layout.`,
};
