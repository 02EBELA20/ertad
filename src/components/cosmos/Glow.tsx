import { Platform, StyleProp, View, ViewStyle } from 'react-native';

type RGB = [number, number, number];

/**
 * A soft radial glow drawn with a CSS/RN radial gradient (perfectly smooth, no rings).
 * `intensity` is the opacity at the centre (0-1); `squash` < 1 makes it an ellipse.
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
  squash?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [r, g, b] = color;
  const c = (a: number) => `rgba(${r},${g},${b},${a.toFixed(3)})`;
  const gradient = `radial-gradient(ellipse closest-side, ${c(intensity)} 0%, ${c(intensity * 0.55)} 30%, ${c(intensity * 0.2)} 60%, ${c(0)} 100%)`;
  const bg = Platform.OS === 'web' ? { backgroundImage: gradient } : { experimental_backgroundImage: gradient };
  return <View pointerEvents="none" style={[{ width: size, height: size * squash }, bg as ViewStyle, style]} />;
}

export const COSMOS = {
  violet: [107, 78, 255] as RGB,
  magenta: [184, 79, 214] as RGB,
  teal: [43, 179, 192] as RGB,
  gold: [217, 164, 65] as RGB,
  blue: [70, 120, 255] as RGB,
};
