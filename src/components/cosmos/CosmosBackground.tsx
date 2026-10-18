import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
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

/**
 * Deep-space backdrop: drifting nebula clouds, three twinkling star layers and an occasional
 * shooting star. Sits behind a screen, ignores touches.
 */
export function CosmosBackground() {
  const { width: W, height: H } = useWindowDimensions();
  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const twinkle = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current;
  const drift = useRef(new Animated.Value(0)).current;
  const shoot = useRef(new Animated.Value(0)).current;
  const [shootPos, setShootPos] = useState({ x: W * 0.5, y: H * 0.1 });

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
    return Array.from({ length: 78 }, (_, i) => {
      const bright = r() > 0.88;
      return {
        x: r() * W,
        y: r() * H,
        size: bright ? 2.6 + r() * 1.2 : 0.8 + r() * 1.3,
        alpha: bright ? 0.95 : 0.35 + r() * 0.5,
        layer: i % 3,
        bright,
        tint: r() > 0.7 ? 'rgb(190,200,255)' : r() > 0.5 ? 'rgb(255,236,200)' : '#FFFFFF',
      };
    });
  }, [W, H]);

  useEffect(() => {
    if (!active || reduceMotion) return;
    const loops = twinkle.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 1800 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.25, duration: 2200 + i * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    const d = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loops.forEach((l) => l.start());
    d.start();
    return () => {
      loops.forEach((l) => l.stop());
      d.stop();
    };
  }, [active, reduceMotion, twinkle, drift]);

  // A shooting star every 8-14 seconds.
  useEffect(() => {
    if (!active || reduceMotion) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const fire = () => {
      if (!alive) return;
      setShootPos({ x: W * (0.35 + Math.random() * 0.55), y: H * (0.02 + Math.random() * 0.3) });
      shoot.setValue(0);
      Animated.timing(shoot, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        if (alive) timer = setTimeout(fire, 8000 + Math.random() * 6000);
      });
    };
    timer = setTimeout(fire, 3000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, reduceMotion, W, H, shoot]);

  const driftA = drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });
  const driftB = drift.interpolate({ inputRange: [0, 1], outputRange: [14, -14] });
  const sx = shoot.interpolate({ inputRange: [0, 1], outputRange: [0, -240] });
  const sy = shoot.interpolate({ inputRange: [0, 1], outputRange: [0, 110] });
  const so = shoot.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.7, 0] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
      {/* nebula clouds */}
      <Animated.View style={[styles.abs, { left: -W * 0.35, top: -H * 0.08, transform: [{ translateX: driftA }] }]}>
        <Glow size={W * 1.5} color={COSMOS.violet} intensity={0.34} />
      </Animated.View>
      <Animated.View style={[styles.abs, { left: W * 0.3, top: H * 0.22, transform: [{ translateX: driftB }] }]}>
        <Glow size={W * 1.0} color={COSMOS.magenta} intensity={0.2} />
      </Animated.View>
      <Animated.View style={[styles.abs, { left: -W * 0.3, top: H * 0.6, transform: [{ translateX: driftA }] }]}>
        <Glow size={W * 1.3} color={COSMOS.teal} intensity={0.18} />
      </Animated.View>
      <View style={[styles.abs, { left: W * 0.45, top: H * 0.72 }]}>
        <Glow size={W * 0.9} color={COSMOS.gold} intensity={0.1} />
      </View>

      {/* stars, three layers that twinkle out of phase */}
      {[0, 1, 2].map((layer) => (
        <Animated.View key={layer} style={[StyleSheet.absoluteFill, { opacity: twinkle[layer] }]}>
          {stars
            .filter((s) => s.layer === layer)
            .map((s, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                  borderRadius: s.size / 2,
                  backgroundColor: s.tint,
                  opacity: s.alpha,
                  boxShadow: s.bright ? `0 0 ${s.size * 3}px rgba(255,255,255,0.7)` : undefined,
                }}
              />
            ))}
        </Animated.View>
      ))}

      {/* shooting star: head plus a fading tail */}
      <Animated.View
        style={{
          position: 'absolute',
          left: shootPos.x,
          top: shootPos.y,
          opacity: so,
          transform: [{ translateX: sx }, { translateY: sy }, { rotate: '24deg' }],
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {[70, 46, 26, 12].map((w, i) => (
          <View
            key={w}
            style={{
              position: 'absolute',
              right: 0,
              width: w * 1.5,
              height: 2,
              borderRadius: 1,
              backgroundColor: `rgba(255,255,255,${0.12 + i * 0.16})`,
            }}
          />
        ))}
        <View style={styles.head} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  head: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 8px rgba(255,255,255,0.95)',
  },
});
