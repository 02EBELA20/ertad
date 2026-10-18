import { StyleProp, View, ViewStyle } from 'react-native';

type RGB = [number, number, number];

/**
 * A soft radial glow made of stacked translucent circles (no gradient library needed).
 * `intensity` is the opacity at the very centre (0-1).
 */
export function Glow({
  size,
  color,
  intensity = 0.4,
  squash = 1,
  style,
}: {
  size: number;
  color: RGB;
  intensity?: number;
  /** height / width ratio; below 1 makes a soft ellipse */
  squash?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const LAYERS = 8;
  const h = size * squash;
  return (
    <View pointerEvents="none" style={[{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }, style]}>
      {Array.from({ length: LAYERS }, (_, i) => {
        const k = 1 - i / LAYERS; // 1 -> small
        const w = size * k;
        const hh = h * k;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: w,
              height: hh,
              borderRadius: Math.max(w, hh) / 2,
              backgroundColor: `rgba(${color[0]},${color[1]},${color[2]},${(intensity / LAYERS) * 1.6})`,
            }}
          />
        );
      })}
    </View>
  );
}

export const COSMOS = {
  violet: [107, 78, 255] as RGB,
  magenta: [184, 79, 214] as RGB,
  teal: [43, 179, 192] as RGB,
  gold: [217, 164, 65] as RGB,
  blue: [70, 120, 255] as RGB,
};
