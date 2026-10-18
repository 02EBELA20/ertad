import { Animated, StyleSheet, View } from 'react-native';

const RED = '#D7262E';
const BLUE = '#26398C';
const STRIPS = 9;

function Cross({ x, y, s }: { x: number; y: number; s: number }) {
  const t = Math.max(1.5, s / 3.2);
  return (
    <View style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s }}>
      <View style={{ position: 'absolute', left: (s - t) / 2, top: 0, width: t, height: s, backgroundColor: RED }} />
      <View style={{ position: 'absolute', top: (s - t) / 2, left: 0, height: t, width: s, backgroundColor: RED }} />
    </View>
  );
}

/** Whole Georgian flag (St George's cross + four Bolnur-Katskhuri crosses) filling a square. */
function Georgia({ size }: { size: number }) {
  const bar = size * 0.14;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF' }}>
      <View style={{ position: 'absolute', left: size / 2 - bar / 2, top: 0, width: bar, height: size, backgroundColor: RED }} />
      <View style={{ position: 'absolute', top: size / 2 - bar / 2, left: 0, height: bar, width: size, backgroundColor: RED }} />
      <Cross x={size * 0.25} y={size * 0.25} s={size * 0.17} />
      <Cross x={size * 0.75} y={size * 0.25} s={size * 0.17} />
      <Cross x={size * 0.25} y={size * 0.75} s={size * 0.17} />
      <Cross x={size * 0.75} y={size * 0.75} s={size * 0.17} />
    </View>
  );
}

/** American flag, mirrored so the blue canton sits on the right. */
function Usa({ size }: { size: number }) {
  const sh = size / 7;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff' }}>
      {Array.from({ length: 7 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, top: i * sh, width: size, height: sh + 0.5, backgroundColor: i % 2 === 0 ? RED : '#FFFFFF' }} />
      ))}
      <View style={{ position: 'absolute', left: size * 0.5, top: 0, width: size * 0.5, height: size * 0.5, backgroundColor: BLUE }}>
        {Array.from({ length: 9 }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: size * 0.5 * (0.16 + (i % 3) * 0.28),
              top: size * 0.5 * (0.16 + Math.floor(i / 3) * 0.28),
              width: size * 0.06,
              height: size * 0.06,
              borderRadius: size * 0.03,
              backgroundColor: '#fff',
            }}
          />
        ))}
      </View>
    </View>
  );
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * One merged globe: the Georgian flag melts into the American one (strips of the Georgian flag
 * fade out from left to right over the American flag). The flags sway sideways under fixed
 * lighting, so the ball looks like it is turning.
 */
export function FlagPlanet({ size, sway }: { size: number; sway: Animated.AnimatedInterpolation<number> | Animated.Value }) {
  const pad = 10;
  const full = size + pad * 2;
  const w = full / STRIPS;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Animated.View style={{ position: 'absolute', left: -pad, top: 0, width: full, height: size, transform: [{ translateX: sway }] }}>
        <Usa size={full} />
        {Array.from({ length: STRIPS }, (_, i) => {
          const t = (i + 0.5) / STRIPS;
          const op = 1 - smooth(Math.min(1, Math.max(0, (t - 0.18) / 0.62)));
          if (op < 0.02) return null;
          return (
            <View key={i} style={{ position: 'absolute', left: i * w, top: 0, width: w + 0.5, height: size, overflow: 'hidden', opacity: op }}>
              <View style={{ position: 'absolute', left: -i * w, top: 0 }}>
                <Georgia size={full} />
              </View>
            </View>
          );
        })}
      </Animated.View>
      {/* sphere shading + glass highlight */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            boxShadow: 'inset -18px -18px 26px rgba(0,0,24,0.7), inset 8px 8px 16px rgba(255,255,255,0.3)',
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: size * 0.18, top: size * 0.12, width: size * 0.3, height: size * 0.16, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-30deg' }] }}
      />
    </View>
  );
}

/** A tilted golden ring around the globe; draw `back` under the planet and `front` over it. */
export function PlanetRing({ size, half }: { size: number; half: 'back' | 'front' }) {
  const RW = size * 1.8;
  const RH = size * 0.56;
  const ellipse = {
    width: RW,
    height: RH,
    borderRadius: RW,
    borderWidth: 3,
    borderColor: 'rgba(255,214,120,0.95)',
    boxShadow: '0 0 12px 1px rgba(255,200,90,0.75), inset 0 0 8px rgba(255,200,90,0.5)',
  } as const;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', width: RW, height: RH, transform: [{ rotate: '-16deg' }], zIndex: half === 'back' ? 49 : 51 }}
    >
      <View style={{ position: 'absolute', left: 0, top: half === 'back' ? 0 : RH / 2, width: RW, height: RH / 2, overflow: 'hidden' }}>
        <View style={[ellipse, { position: 'absolute', left: 0, top: half === 'back' ? 0 : -RH / 2 }]} />
      </View>
    </View>
  );
}
