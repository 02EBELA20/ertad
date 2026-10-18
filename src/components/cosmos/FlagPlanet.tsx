import { StyleSheet, View } from 'react-native';

const RED = '#D7262E';
const BLUE = '#26398C';

function Cross({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  const t = Math.max(1.6, s / 3.2);
  return (
    <View style={{ position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s }}>
      <View style={{ position: 'absolute', left: (s - t) / 2, top: 0, width: t, height: s, backgroundColor: RED }} />
      <View style={{ position: 'absolute', top: (s - t) / 2, left: 0, height: t, width: s, backgroundColor: RED }} />
    </View>
  );
}

/**
 * One merged Georgian-American emblem: the red St George's cross divides the disc into four
 * fields. Two hold the small Georgian crosses, one holds the American stars on blue and one
 * the American stripes.
 */
export function FlagPlanet({ size }: { size: number }) {
  const bar = size * 0.13;
  const h = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      {/* top-right: stars on blue */}
      <View style={{ position: 'absolute', left: h, top: 0, width: h, height: h, backgroundColor: BLUE }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: h * (0.24 + (i % 2) * 0.34),
              top: h * (0.16 + Math.floor(i / 2) * 0.26),
              width: size * 0.065,
              height: size * 0.065,
              borderRadius: size,
              backgroundColor: '#FFFFFF',
            }}
          />
        ))}
      </View>
      {/* bottom-right: stripes */}
      <View style={{ position: 'absolute', left: h, top: h, width: h, height: h }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, top: (i * h) / 6, width: h, height: h / 6 + 0.5, backgroundColor: i % 2 === 0 ? RED : '#FFFFFF' }} />
        ))}
      </View>
      {/* the big cross */}
      <View style={{ position: 'absolute', left: h - bar / 2, top: 0, width: bar, height: size, backgroundColor: RED }} />
      <View style={{ position: 'absolute', top: h - bar / 2, left: 0, height: bar, width: size, backgroundColor: RED }} />
      {/* Georgian small crosses on the left */}
      <Cross cx={h * 0.5 - bar * 0.1} cy={h * 0.5 - bar * 0.1} s={size * 0.16} />
      <Cross cx={h * 0.5 - bar * 0.1} cy={h * 1.5 + bar * 0.1} s={size * 0.16} />
      {/* sphere shading */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: 'rgba(255,214,120,0.9)',
            boxShadow: 'inset -14px -14px 22px rgba(0,0,24,0.55), inset 6px 6px 12px rgba(255,255,255,0.25)',
          },
        ]}
      />
    </View>
  );
}
