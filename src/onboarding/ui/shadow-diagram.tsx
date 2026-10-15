import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { fixed, night } from '@/theme/palette';

const GROUND = 70;
const POST = 28;
const BASE_X = 46;
const NOON = 4;

/**
 * Why there are two Asr times. A post, the sun, and its shadow falling away from the sun. Asr begins
 * when the shadow reaches the post's length plus its small noon shadow (`times` 1), or twice the
 * post's length plus the noon shadow in the Hanafi school (`times` 2). The sun sits on the line from
 * the shadow's tip through the top of the post, so the angles are true: about 45 and 27 degrees.
 */
export function ShadowDiagram({ times, lit }: { times: 1 | 2; lit: boolean }) {
  const top = { x: BASE_X, y: GROUND - POST };
  const tip = { x: BASE_X + NOON + POST * times, y: GROUND };
  const dx = top.x - tip.x;
  const dy = top.y - tip.y;
  const length = Math.hypot(dx, dy);
  const sun = { x: top.x + (dx / length) * 36, y: top.y + (dy / length) * 36 };

  return (
    <Svg width="100%" height={88} viewBox="0 0 124 84" accessible={false}>
      <Line x1={sun.x} y1={sun.y} x2={tip.x} y2={tip.y} stroke={night.line} strokeWidth={1.5} strokeDasharray="2 4" />
      <Circle cx={sun.x} cy={sun.y} r={7} fill={lit ? fixed.moon : night.inkSubtle} />
      <Line x1={4} y1={GROUND} x2={120} y2={GROUND} stroke={night.line} strokeWidth={2} strokeLinecap="round" />
      <Rect x={BASE_X} y={GROUND - 2} width={tip.x - BASE_X} height={4} rx={2} fill={lit ? fixed.prayer : night.inkSubtle} />
      <Rect x={BASE_X} y={GROUND - 2} width={NOON} height={4} fill={lit ? fixed.prayerDeep : night.line} />
      <Rect x={BASE_X - 2} y={top.y} width={4} height={POST} rx={2} fill={lit ? night.ink : night.inkMuted} />
    </Svg>
  );
}
