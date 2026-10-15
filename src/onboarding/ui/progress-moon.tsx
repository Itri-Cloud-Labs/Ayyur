import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The moon at the top of onboarding, waxing from new to full as the user goes. `fraction` is 0 to 1.
 * The lit limb is on the right and an elliptical terminator closes it, like the streak phases.
 */
export function ProgressMoon({ fraction, size = 28 }: { fraction: number; size?: number }) {
  const f = Math.min(1, Math.max(0, fraction));
  const r = 10;
  const rx = Math.abs(1 - 2 * f) * r;
  const lit =
    f >= 0.995
      ? null
      : `M12 2A${r} ${r} 0 0 1 12 22A${rx.toFixed(2)} ${r} 0 0 ${f < 0.5 ? 0 : 1} 12 2Z`;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx={12} cy={12} r={r} fill="#202941" />
      {f >= 0.995 ? <Circle cx={12} cy={12} r={r} fill="#fdce3e" /> : f > 0.005 ? <Path d={lit!} fill="#fdce3e" /> : null}
    </Svg>
  );
}
