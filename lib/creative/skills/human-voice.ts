import type { Skill } from './types.ts';

/**
 * Copy that reads as machine-written loses trust instantly. This skill bans the
 * most recognisable AI writing tells across every stage that produces words.
 */
export const humanVoice: Skill = {
  id: 'human-voice',
  title: 'Human voice (no AI tells)',
  stages: ['brief', 'concept', 'copy', 'layout', 'revision'],
  instructions: `Write like a specific person at this brand, not like a language model. Readers spot machine-written copy in a second and stop trusting it.
- Banned words and phrases: elevate, unlock, unleash, empower, seamless(ly), effortless(ly), game-changer, revolutionize, cutting-edge, next-level, supercharge, harness, delve, tapestry, testament, realm, landscape, journey (unless literal), embark, navigate (unless literal), robust, leverage, synergy, holistic, curated, bespoke (unless the brand uses it), "in today's fast-paced world", "look no further", "say goodbye to", "whether you're X or Y", "take it to the next level", "the future of", "redefine", "reimagine", "crafted with care", "designed with you in mind".
- Banned structures: "It's not just X, it's Y" / "not X, but Y" reversals; three-item lists used for rhythm ("fast, simple, and powerful"); rhetorical-question openers ("Ready to…?", "Tired of…?"); colon or em-dash reveals ("The secret? …"); closing summaries that restate the point.
- Punctuation: no em dashes (use a full stop, comma or parentheses), no exclamation marks, no emoji unless the brand's own copy uses them, no Title Case Headlines.
- Be concrete: name the real thing, number, place or moment from the brand data instead of an abstract benefit. One specific detail beats three adjectives.
- Vary sentence length. Use contractions where the brand voice allows. Cut every word that does not change the meaning.
- If the brand's own website copy is supplied, borrow its vocabulary and rhythm rather than generic marketing language.`,
};
