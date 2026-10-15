import Svg, { Circle, Line, Rect } from 'react-native-svg';

/**
 * Why there are two Asr times: Asr begins when an upright object's shadow reaches its own length, or
 * twice its length in the Hanafi school. Drawn to scale: a post, the sun, and its shadow on the ground.
 */
export function ShadowDiagram({ times, lit }: { times: 1 | 2; lit: boolean }) {
  const ground = 70;
  const post = 32;
  const baseX = 18;
  const shadow = post * times;
  return (
    <Svg width="100%" height={84} viewBox="0 0 120 84" accessible={false}>
      <Circle cx={times === 1 ? 92 : 100} cy={times === 1 ? 20 : 30} r={8} fill={lit ? '#fdce3e' : '#8f98af'} />
      <Line x1={6} y1={ground} x2={114} y2={ground} stroke="#333c55" strokeWidth={2} strokeLinecap="round" />
      <Rect x={baseX - 2} y={ground - post} width={4} height={post} rx={2} fill={lit ? '#f0f3fc' : '#b5bed2'} />
      <Rect x={baseX} y={ground - 2} width={shadow} height={4} rx={2} fill={lit ? '#7fb3ff' : '#4c5670'} />
    </Svg>
  );
}
