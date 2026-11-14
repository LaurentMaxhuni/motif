import type { Skill, SkillContext } from './types.ts';
import { visualKinds } from './types.ts';

const channelNotes: Record<string, string> = {
  Instagram: 'Instagram: the image is seen at thumbnail size in a fast scroll; it must read in under a second. Captions can carry detail the visual leaves out.',
  Facebook: 'Facebook: broad audience; lead with a clear, concrete benefit and keep the visual uncluttered.',
  LinkedIn: 'LinkedIn: professional context; favour clarity, credibility and a specific point of view over hype.',
  Pinterest: 'Pinterest: aspirational and discoverable; the image should inspire saving, with a useful idea in the copy.',
  TikTok: 'TikTok: native, energetic and human; hooks in the first second, no corporate tone.',
  Twitter: 'X/Twitter: compact and witty; one thought, no filler.',
  Threads: 'Threads: conversational and warm; write like a person, not a brand account.',
  Bluesky: 'Bluesky: candid, informed tone; avoid marketing clichés.',
  Email: 'Email: subject line earns the open, preview text extends it, the body delivers one clear action.',
  Blog: 'Blog: useful first; structure for scanning with descriptive headings; no keyword stuffing.',
};

export const advertising: Skill = {
  id: 'advertising',
  title: 'Advertising and copywriting',
  stages: ['concept', 'copy', 'layout', 'revision'],
  instructions: ({ kind, channel }: SkillContext) => [
    `Write like a senior copywriter. Copy is the idea made verbal, not a description of the image.
- Headline: one thought, concrete and specific, max 8 words. Prefer a tension, a twist, a confident claim the brand can honestly make, or a vivid image. No puns that need explaining, no "Elevate your…", "Unlock…", "Discover the power of…", "Introducing…", or exclamation marks.
- Subhead (if used): adds the missing information the headline withholds — what it is or why it matters — in one short line.
- CTA: a specific verb plus outcome ("Book a tasting", "Shop the linen edit"), 2–4 words. Never "Click here" or "Learn more" when something more specific is true.
- Show, then tell: let the visual carry emotion and the words carry meaning. Do not repeat in words what the image already shows.
- Write in the brand's voice and language. Use the audience's vocabulary, not marketing jargon.
- Only claim what the brand data supports. No invented prices, discounts, statistics, awards, testimonials or guarantees.`,
    visualKinds.has(kind || '') ? 'For a static ad, the hierarchy of the message is: one stopping visual → one headline → one supporting line → one action. Anything beyond that is optional and usually weakens the ad.' : '',
    channel && channelNotes[channel] ? channelNotes[channel] : '',
  ].filter(Boolean).join('\n'),
};
