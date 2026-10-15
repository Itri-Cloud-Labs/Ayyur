// Generated layer files from scripts/brand/generate.mjs (assets/brand/live). Each sits on the same canvas
// as the body, so they stack without offsets.

export const body = require('../../../assets/brand/live/body.png');

export const layers = {
  happy: {
    eyes: require('../../../assets/brand/live/happy-eyes.png'),
    mouth: require('../../../assets/brand/live/happy-mouth.png'),
  },
  joyful: {
    eyes: require('../../../assets/brand/live/joyful-eyes.png'),
    mouth: require('../../../assets/brand/live/joyful-mouth.png'),
  },
  wink: {
    eyes: require('../../../assets/brand/live/wink-eyes.png'),
    mouth: require('../../../assets/brand/live/wink-mouth.png'),
  },
  gentle: {
    eyes: require('../../../assets/brand/live/gentle-eyes.png'),
    mouth: require('../../../assets/brand/live/gentle-mouth.png'),
  },
  sleepy: {
    eyes: require('../../../assets/brand/live/sleepy-eyes.png'),
    mouth: require('../../../assets/brand/live/sleepy-mouth.png'),
  },
  thinking: {
    eyes: require('../../../assets/brand/live/thinking-eyes.png'),
    mouth: require('../../../assets/brand/live/thinking-mouth.png'),
  },
  curious: {
    eyes: require('../../../assets/brand/live/curious-eyes.png'),
    mouth: require('../../../assets/brand/live/curious-mouth.png'),
  },
  caring: {
    eyes: require('../../../assets/brand/live/caring-eyes.png'),
    mouth: require('../../../assets/brand/live/caring-mouth.png'),
  },
  protected: {
    eyes: require('../../../assets/brand/live/protected-eyes.png'),
    mouth: require('../../../assets/brand/live/protected-mouth.png'),
  },
  listening: {
    eyes: require('../../../assets/brand/live/listening-eyes.png'),
    mouth: require('../../../assets/brand/live/listening-mouth.png'),
  },
  delighted: {
    eyes: require('../../../assets/brand/live/delighted-eyes.png'),
    mouth: require('../../../assets/brand/live/delighted-mouth.png'),
  },
  surprised: {
    eyes: require('../../../assets/brand/live/surprised-eyes.png'),
    mouth: require('../../../assets/brand/live/surprised-mouth.png'),
  },
} as const;

export type Expression = keyof typeof layers;

/** Expressions whose eyes are open ellipses, so a blink reads correctly. */
export const BLINKS = new Set<Expression>(['happy', 'gentle', 'thinking', 'curious', 'listening', 'surprised']);

/** Degrees of head tilt per expression, matching the static mascot exports. */
export const TILTS: Record<Expression, number> = {
  happy: -6,
  joyful: -10,
  wink: 8,
  gentle: 0,
  sleepy: 10,
  thinking: -4,
  curious: 12,
  caring: 4,
  protected: 0,
  listening: -8,
  delighted: -4,
  surprised: 6,
};
