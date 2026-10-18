import { StyleProp, View, ViewStyle } from 'react-native';

type RGB = [number, number, number];

/**
 * A soft glow made from one blurred shadow (smooth, no visible rings).
 * `intensity` is roughly the opacity at the centre (0-1).
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
  const [r, g, b] = color;
  const core = size * 0.3;
  return (
    <View
      pointerEvents="none"
      style={[{ width: size, height: size * squash, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <View
        style={{
          width: core,
          height: Math.max(2, core * squash),
          borderRadius: 999,
          backgroundColor: `rgba(${r},${g},${b},${intensity * 0.6})`,
          boxShadow: `0 0 ${size * 0.4}px ${size * 0.17}px rgba(${r},${g},${b},${intensity})`,
        }}
      />
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
