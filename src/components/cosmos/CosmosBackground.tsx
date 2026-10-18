import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors } from '@/theme/colors';
import { COSMOS, Glow } from './Glow';

/** Small deterministic random generator, so stars stay put between renders. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gradientStyle(css: string): ViewStyle {
  return (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;
}

/** A star that now and then flares up with a four-point sparkle. */
function Sparkle({ x, y, size, delay, active }: { x: number; y: number; size: number; delay: number; active: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const flare = () => {
      if (!alive) return;
      v.setValue(0);
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        if (alive) timer = setTimeout(flare, 2500 + Math.random() * 6500);
      });
    };
    timer = setTimeout(flare, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, delay, v]);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const spin = v.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });
  const ray = gradientStyle('radial-gradient(ellipse closest-side, rgba(255,255,255,0.95) 0%, rgba(210,225,255,0.5) 35%, rgba(210,225,255,0) 100%)');
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: v,
        transform: [{ scale }, { rotate: spin }],
      }}
    >
      <View style={[{ position: 'absolute', width: size, height: size * 0.09 }, ray]} />
      <View style={[{ position: 'absolute', width: size * 0.09, height: size }, ray]} />
      <View style={[{ position: 'absolute', width: size * 0.5, height: size * 0.05, transform: [{ rotate: '45deg' }] }, ray]} />
      <View style={[{ position: 'absolute', width: size * 0.5, height: size * 0.05, transform: [{ rotate: '-45deg' }] }, ray]} />
      <View style={{ width: size * 0.13, height: size * 0.13, borderRadius: size, backgroundColor: '#fff', boxShadow: '0 0 10px 3px rgba(220,230,255,0.9)' }} />
    </Animated.View>
  );
}

/**
 * Deep-space backdrop: nebula clouds, a faint Milky Way band, three layers of twinkling stars,
 * bright sparkles that flare now and then, and rare shooting stars with a proper tail.
 */
export function CosmosBackground() {
  const { width: W, height: H } = useWindowDimensions();
  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const twinkle = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current;
  const layerY = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const layerX = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const nebulaRot = useRef(new Animated.Value(0)).current;
  const bandSwing = useRef(new Animated.Value(0)).current;
  const nebulaBreath = useRef(new Animated.Value(0)).current;
  const shoot = useRef(new Animated.Value(0)).current;
  const [shot, setShot] = useState({ x: W * 0.8, y: H * 0.1, angle: 155, len: 140, dist: 260 });

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const stars = useMemo(() => {
    const r = rng(20261018);
    return Array.from({ length: 70 }, (_, i) => {
      const bright = r() > 0.9;
      return {
        x: r() * W,
        y: r() * H,
        size: bright ? 2.4 + r() * 1.2 : 0.8 + r() * 1.3,
        alpha: bright ? 0.95 : 0.35 + r() * 0.5,
        layer: i % 3,
        bright,
        tint: r() > 0.7 ? 'rgb(190,200,255)' : r() > 0.5 ? 'rgb(255,236,200)' : '#FFFFFF',
      };
    });
  }, [W, H]);

  // Dense dust of tiny stars along the Milky Way band (positions in the band's own rotated frame).
  const dust = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 70 }, () => {
      const g = (r() + r() + r() - 1.5) / 1.5; // roughly gaussian -1..1
      return { x: (r() - 0.5) * W * 1.9, y: g * H * 0.07, size: 0.7 + r() * 1.1, alpha: 0.25 + r() * 0.55 };
    });
  }, [W, H]);

  const motes = useMemo(() => {
    const r = rng(909);
    const colorsList = ['rgba(150,170,255,0.5)', 'rgba(255,200,140,0.45)', 'rgba(200,150,255,0.45)'];
    return Array.from({ length: 12 }, () => ({
      x: r() * W,
      y: r() * H,
      size: 2 + r() * 2.5,
      color: colorsList[Math.floor(r() * colorsList.length)],
    }));
  }, [W, H]);

  const sparkles = useMemo(() => {
    const r = rng(4242);
    return Array.from({ length: 9 }, (_, i) => ({
      x: 20 + r() * (W - 40),
      y: 30 + r() * (H - 90),
      size: 22 + r() * 22,
      delay: 600 + i * 900 + r() * 2000,
    }));
  }, [W, H]);

  useEffect(() => {
    if (!active || reduceMotion) return;
    const loops = twinkle.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 1800 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.25, duration: 2200 + i * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, reduceMotion, twinkle]);

  // Everything drifts all the time, driven by the clock (never stalls): the star layers slide
  // past at different speeds like flying through space, the nebulae circle slowly, the Milky
  // Way swings gently.
  useEffect(() => {
    if (!active || reduceMotion) return;
    const speeds = [5, 9, 15, 26]; // px per second, back to front (last = glowing motes)
    let raf = 0;
    const frame = () => {
      const t = Date.now() / 1000;
      for (let i = 0; i < 4; i++) {
        layerY[i].setValue(-((t * speeds[i]) % H));
        layerX[i].setValue(Math.sin(t / (9 + i * 3)) * (6 + i * 5));
      }
      nebulaRot.setValue((t / 240) % 1);
      bandSwing.setValue(Math.sin((t / 34) * 2 * Math.PI));
      nebulaBreath.setValue(0.5 + 0.5 * Math.sin((t / 11) * 2 * Math.PI));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, reduceMotion, H, layerY, layerX, nebulaRot, bandSwing, nebulaBreath]);

  // A shooting star every 9-17 seconds, in a random place and direction.
  useEffect(() => {
    if (!active || reduceMotion) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const fire = () => {
      if (!alive) return;
      const angle = 140 + Math.random() * 35; // degrees, travelling down-left
      setShot({ x: W * (0.45 + Math.random() * 0.5), y: H * (0.02 + Math.random() * 0.28), angle, len: 110 + Math.random() * 70, dist: 200 + Math.random() * 120 });
      shoot.setValue(0);
      Animated.timing(shoot, { toValue: 1, duration: 800 + Math.random() * 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        if (alive) timer = setTimeout(fire, 9000 + Math.random() * 8000);
      });
    };
    timer = setTimeout(fire, 3500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, reduceMotion, W, H, shoot]);

  const nebulaTurn = nebulaRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const bandRotate = bandSwing.interpolate({ inputRange: [-1, 1], outputRange: ['-40deg', '-12deg'] });
  const nebulaOpacity = nebulaBreath.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const rad = (shot.angle * Math.PI) / 180;
  const sx = shoot.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * shot.dist] });
  const sy = shoot.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * shot.dist] });
  const so = shoot.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 0.8, 0] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
      {/* nebula clouds, slowly circling the middle of the screen and breathing */}
      <Animated.View style={[styles.abs, { left: W / 2, top: H / 2, opacity: nebulaOpacity, transform: [{ rotate: nebulaTurn }] }]}>
        <View style={[styles.abs, { left: -W * 1.1, top: -H * 0.58 }]}>
          <Glow size={W * 1.5} color={COSMOS.violet} intensity={0.32} />
        </View>
        <View style={[styles.abs, { left: W * 0.0, top: -H * 0.3 }]}>
          <Glow size={W * 1.0} color={COSMOS.magenta} intensity={0.24} />
        </View>
        <View style={[styles.abs, { left: -W * 0.9, top: H * 0.08 }]}>
          <Glow size={W * 1.3} color={COSMOS.teal} intensity={0.2} />
        </View>
        <View style={[styles.abs, { left: W * 0.1, top: H * 0.22 }]}>
          <Glow size={W * 0.9} color={COSMOS.blue} intensity={0.2} />
        </View>
      </Animated.View>

      {/* Milky Way band with a dense dust of stars */}
      <Animated.View style={[styles.abs, { left: W / 2, top: H * 0.42, transform: [{ rotate: bandRotate }] }]}>
        <View style={[styles.abs, { left: -W * 1.0, top: -H * 0.18 }]}>
          <Glow size={W * 2} squash={(H * 0.36) / (W * 2)} color={[170, 150, 255]} intensity={0.2} />
        </View>
        <View style={[styles.abs, { left: -W * 0.8, top: -H * 0.07 }]}>
          <Glow size={W * 1.6} squash={(H * 0.14) / (W * 1.6)} color={[255, 220, 190]} intensity={0.13} />
        </View>
        {dust.map((d, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: d.x,
              top: d.y,
              width: d.size,
              height: d.size,
              borderRadius: d.size,
              backgroundColor: '#fff',
              opacity: d.alpha,
            }}
          />
        ))}
      </Animated.View>

      {/* stars: three layers that twinkle and slide past at different speeds, plus drifting motes */}
      {[0, 1, 2].map((layer) => (
        <Animated.View
          key={layer}
          style={[StyleSheet.absoluteFill, { opacity: twinkle[layer], transform: [{ translateY: layerY[layer] }, { translateX: layerX[layer] }] }]}
        >
          {[0, H].flatMap((off) =>
            stars
              .filter((s) => s.layer === layer)
              .map((s, i) => (
                <View
                  key={`${off}-${i}`}
                  style={{
                    position: 'absolute',
                    left: s.x,
                    top: s.y + off,
                    width: s.size,
                    height: s.size,
                    borderRadius: s.size / 2,
                    backgroundColor: s.tint,
                    opacity: s.alpha,
                    boxShadow: s.bright ? `0 0 ${s.size * 3}px rgba(255,255,255,0.7)` : undefined,
                  }}
                />
              )),
          )}
        </Animated.View>
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: layerY[3] }, { translateX: layerX[3] }] }]}>
        {[0, H].flatMap((off) =>
          motes.map((m, i) => (
            <View
              key={`${off}-${i}`}
              style={{
                position: 'absolute',
                left: m.x,
                top: m.y + off,
                width: m.size,
                height: m.size,
                borderRadius: m.size,
                backgroundColor: m.color,
                boxShadow: `0 0 ${m.size * 4}px ${m.size}px ${m.color}`,
                opacity: 0.5,
              }}
            />
          )),
        )}
      </Animated.View>

      {/* bright sparkles */}
      {!reduceMotion && sparkles.map((s, i) => <Sparkle key={i} {...s} active={active} />)}

      {/* shooting star: a tail that fades towards the back, head in front */}
      <Animated.View
        style={{
          position: 'absolute',
          left: shot.x,
          top: shot.y,
          width: shot.len,
          height: 2.5,
          opacity: so,
          transform: [{ translateX: sx }, { translateY: sy }, { rotate: `${shot.angle}deg` }],
        }}
      >
        <View
          style={[
            { position: 'absolute', left: 0, top: 0, width: shot.len, height: 2.5, borderRadius: 2 },
            gradientStyle('linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(190,210,255,0.35) 55%, rgba(255,255,255,0.95) 100%)'),
          ]}
        />
        <View style={styles.head} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  head: {
    position: 'absolute',
    right: -2,
    top: -1,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 10px 3px rgba(200,220,255,0.95)',
  },
});
