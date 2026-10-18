import { Animated, StyleSheet, View } from 'react-native';

const RED = '#D7262E';
const BLUE = '#2A3C8F';

/** One small plus-shaped cross (Georgian flag corner crosses). */
function Cross({ x, y, s }: { x: number; y: number; s: number }) {
  const t = Math.max(1.5, s / 3.2);
  return (
    <View style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s }}>
      <View style={{ position: 'absolute', left: (s - t) / 2, top: 0, width: t, height: s, backgroundColor: RED }} />
      <View style={{ position: 'absolute', top: (s - t) / 2, left: 0, height: t, width: s, backgroundColor: RED }} />
    </View>
  );
}

/**
 * A little globe: the left half is the Georgian flag, the right half the American one, joined
 * in the middle. The flags sway sideways under fixed lighting, so it looks like a turning ball.
 */
export function FlagPlanet({ size, sway }: { size: number; sway: Animated.AnimatedInterpolation<number> | Animated.Value }) {
  const half = size / 2;
  const pad = 8; // extra flag width so swaying never shows a gap
  const stripeH = size / 13;
  const cw = half * 0.5;
  const ch = size * 0.5;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Animated.View style={{ position: 'absolute', left: -pad, top: 0, width: size + pad * 2, height: size, transform: [{ translateX: sway }] }}>
        {/* Georgia */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: half + pad, height: size, backgroundColor: '#FFFFFF' }}>
          <View style={{ position: 'absolute', left: pad + half * 0.5 - size * 0.055, top: 0, width: size * 0.11, height: size, backgroundColor: RED }} />
          <View style={{ position: 'absolute', left: 0, top: size / 2 - size * 0.055, width: half + pad, height: size * 0.11, backgroundColor: RED }} />
          <Cross x={pad + half * 0.25} y={size * 0.26} s={size * 0.13} />
          <Cross x={pad + half * 0.75} y={size * 0.26} s={size * 0.13} />
          <Cross x={pad + half * 0.25} y={size * 0.74} s={size * 0.13} />
          <Cross x={pad + half * 0.75} y={size * 0.74} s={size * 0.13} />
        </View>
        {/* USA */}
        <View style={{ position: 'absolute', left: half + pad, top: 0, width: half + pad, height: size }}>
          {Array.from({ length: 13 }, (_, i) => (
            <View key={i} style={{ position: 'absolute', left: 0, top: i * stripeH, width: '100%', height: stripeH + 0.5, backgroundColor: i % 2 === 0 ? RED : '#FFFFFF' }} />
          ))}
          <View style={{ position: 'absolute', left: 0, top: 0, width: cw + 6, height: ch, backgroundColor: BLUE }}>
            {Array.from({ length: 12 }, (_, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: 4 + (i % 3) * ((cw - 2) / 3),
                  top: 4 + Math.floor(i / 3) * ((ch - 6) / 4),
                  width: 2.4,
                  height: 2.4,
                  borderRadius: 1.2,
                  backgroundColor: '#fff',
                }}
              />
            ))}
          </View>
        </View>
      </Animated.View>
      {/* soft join in the middle */}
      <View pointerEvents="none" style={{ position: 'absolute', left: half - 3, top: 0, width: 6, height: size, backgroundColor: 'rgba(255,240,200,0.35)' }} />
      {/* sphere shading */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            boxShadow: 'inset -16px -16px 24px rgba(0,0,16,0.72), inset 7px 7px 14px rgba(255,255,255,0.32)',
          },
        ]}
      />
    </View>
  );
}
