import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { CategoryGroup } from '@/lib/categories';
import { categoryIcon } from '@/lib/categoryIcons';
import { FeedItem } from '@/lib/feed';
import { describeCategory } from '@/lib/posts';
import { COSMOS, Glow } from '@/components/cosmos/Glow';
import { FlagPlanet } from '@/components/cosmos/FlagPlanet';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

const MAX_SLOTS = 6;
const AVATAR = 54;
const TICK_MS = 4200;
const PERIOD = 36000;
const STEPS = 48;
const TILT = -7; // degrees, a slight tilt makes the ring feel like a real 3D plane
const RY = 0.42;

function phaseOf(i: number) {
  return i / MAX_SLOTS;
}
/** Depth of slot i at time fraction u: -1 far (back) .. +1 near (front, in front of the planet). */
function depthAt(i: number, u: number) {
  return Math.sin(2 * Math.PI * (u + phaseOf(i)));
}

/**
 * A 3D ring of people turning around a glowing planet, like a carousel seen from slightly
 * above. Whoever is at the front is the one being introduced in the card below. Members at
 * the back are small and dim; when one is at the back, it may be swapped for a new member
 * (taken in turn from the pool the server picked fairly) without anyone noticing.
 */
export function OrbitFeed({
  items,
  groups,
  onOpen,
}: {
  items: FeedItem[];
  groups: CategoryGroup[];
  onOpen: (item: FeedItem) => void;
}) {
  const { width } = useWindowDimensions();
  const S = Math.min(width - 32, 400);
  const RX = S / 2 - AVATAR / 2 - 4;
  const H = S * 0.66;
  const slotsCount = Math.min(MAX_SLOTS, items.length);

  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [slots, setSlots] = useState<FeedItem[]>([]);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [zs, setZs] = useState<number[]>(() => Array(MAX_SLOTS).fill(1));
  const lastSwap = useRef(Date.now());
  const featuredRef = useRef(0);

  const slotsRef = useRef<FeedItem[]>([]);
  const queueRef = useRef<FeedItem[]>([]);
  const tickRef = useRef(0);
  const t0 = useRef(Date.now());

  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const boost = useRef(Array.from({ length: MAX_SLOTS }, () => new Animated.Value(1))).current;
  const sway = useRef(new Animated.Value(0)).current;
  const scales = useRef(Array.from({ length: MAX_SLOTS }, () => new Animated.Value(1))).current;

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // (Re)initialise when the server sends a new set.
  const signature = items.map((i) => `${i.kind}-${i.ref_id}`).join('|');
  useEffect(() => {
    slotsRef.current = items.slice(0, slotsCount);
    queueRef.current = items.slice(slotsCount);
    tickRef.current = 0;
    lastSwap.current = Date.now();
    setSlots(slotsRef.current.slice());
    setFeaturedIdx(0);
    scales.forEach((v) => v.setValue(0));
    Animated.stagger(
      120,
      scales.slice(0, slotsCount).map((v) =>
        Animated.spring(v, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      ),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Endless orbit + breathing planet.
  useEffect(() => {
    if (!active || reduceMotion || slotsCount === 0) return;
    spin.setValue(0);
    t0.current = Date.now();
    const rot = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: PERIOD, easing: Easing.linear, useNativeDriver: true }),
    );
    const br = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const sw = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    rot.start();
    br.start();
    sw.start();
    return () => {
      rot.stop();
      br.stop();
      sw.stop();
    };
  }, [active, reduceMotion, slotsCount, spin, breathe]);

  function showFeatured(idx: number) {
    featuredRef.current = idx;
    boost.forEach((v, k) => Animated.spring(v, { toValue: k === idx ? 1.14 : 1, friction: 6, tension: 60, useNativeDriver: true }).start());
    fade.setValue(0);
    setFeaturedIdx(idx);
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }

  // Several times a second: layering, who is at the front, and quiet swaps at the back.
  useEffect(() => {
    if (!active || slotsCount === 0) return;
    const id = setInterval(() => {
      const u = reduceMotion ? 0 : ((Date.now() - t0.current) % PERIOD) / PERIOD;
      const depths = Array.from({ length: MAX_SLOTS }, (_, i) => depthAt(i, u));
      const next = depths.map((d) => Math.round((d + 1) * 50) + 1);
      setZs((prev) => (prev.every((v, i) => Math.abs(v - next[i]) < 4) ? prev : next));

      // front-most member is the featured one
      let front = 0;
      let back = 0;
      for (let i = 0; i < slotsCount; i++) {
        if (depths[i] > depths[front]) front = i;
        if (depths[i] < depths[back]) back = i;
      }
      if (front !== featuredRef.current) showFeatured(front);

      // swap whoever sits at the very back for a new member
      if (!reduceMotion && queueRef.current.length > 0 && depths[back] < -0.85 && Date.now() - lastSwap.current > TICK_MS) {
        lastSwap.current = Date.now();
        const k = back;
        Animated.timing(scales[k], { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
          const incoming = queueRef.current.shift()!;
          queueRef.current.push(slotsRef.current[k]);
          slotsRef.current[k] = incoming;
          setSlots(slotsRef.current.slice());
          Animated.spring(scales[k], { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
        });
      }
    }, 140);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion, slotsCount, signature]);

  // Pre-computed keyframes of every orbit position: x, y, depth scale, depth opacity.
  const tracks = useMemo(() => {
    const input = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);
    const T = (TILT * Math.PI) / 180;
    return Array.from({ length: MAX_SLOTS }, (_, i) => {
      const xs: number[] = [];
      const ys: number[] = [];
      const sc: number[] = [];
      const op: number[] = [];
      for (let k = 0; k <= STEPS; k++) {
        const th = 2 * Math.PI * (k / STEPS + phaseOf(i));
        const x0 = RX * Math.cos(th);
        const y0 = RX * RY * Math.sin(th);
        const d = (Math.sin(th) + 1) / 2; // 0 far .. 1 near
        xs.push(x0 * Math.cos(T) - y0 * Math.sin(T));
        ys.push(x0 * Math.sin(T) + y0 * Math.cos(T));
        sc.push(0.48 + 0.84 * d);
        op.push(0.45 + 0.55 * d);
      }
      return { input, xs, ys, sc, op };
    });
  }, [RX]);

  // Short comet tails: copies of each member's path, slightly behind in time.
  const trails = useMemo(() => {
    const input = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);
    const T = (TILT * Math.PI) / 180;
    return Array.from({ length: MAX_SLOTS }, (_, i) =>
      [0.012, 0.026, 0.042].map((lag) => {
        const xs: number[] = [];
        const ys: number[] = [];
        const op: number[] = [];
        for (let k = 0; k <= STEPS; k++) {
          const th = 2 * Math.PI * (k / STEPS + phaseOf(i) - lag);
          const x0 = RX * Math.cos(th);
          const y0 = RX * RY * Math.sin(th);
          const d = (Math.sin(th) + 1) / 2;
          xs.push(x0 * Math.cos(T) - y0 * Math.sin(T));
          ys.push(x0 * Math.sin(T) + y0 * Math.cos(T));
          op.push(0.25 + 0.75 * d);
        }
        return { input, xs, ys, op };
      }),
    );
  }, [RX]);

  if (slotsCount === 0) return null;

  const featured = slots[featuredIdx] ?? slots[0];
  const fCat = featured?.category_id ? describeCategory(groups, featured.category_id) : { label: '', slug: '' };
  const planetScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const planetGlow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const PLANET = 78;

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {ka.feed.title}
      </AppText>

      <View style={{ width: S, height: H, alignItems: 'center', justifyContent: 'center' }}>
        {/* the orbit plane glows softly (no lines) and the planet has a warm halo */}
        <View style={[styles.abs, { transform: [{ rotate: `${TILT}deg` }] }]}>
          <Glow size={S * 1.04} squash={0.5} color={COSMOS.violet} intensity={0.42} />
        </View>
        <View style={[styles.abs, { transform: [{ rotate: `${TILT}deg` }] }]}>
          <Glow size={S * 0.8} squash={0.34} color={COSMOS.teal} intensity={0.22} />
        </View>
        <Animated.View style={[styles.abs, { opacity: planetGlow, left: S / 2 - PLANET * 2.5, top: H / 2 - PLANET * 1.6 }]}>
          <Glow size={PLANET * 3.2} color={[215, 38, 46]} intensity={0.34} />
        </Animated.View>
        <Animated.View style={[styles.abs, { opacity: planetGlow, left: S / 2 - PLANET * 0.7, top: H / 2 - PLANET * 1.6 }]}>
          <Glow size={PLANET * 3.2} color={[70, 100, 255]} intensity={0.34} />
        </Animated.View>

        {/* the planet: Georgia and America joined in one globe */}
        <Animated.View style={[styles.planet, { width: PLANET, height: PLANET, transform: [{ scale: planetScale }], zIndex: 50 }]}>
          <FlagPlanet
            size={PLANET}
            sway={sway.interpolate({ inputRange: [0, 1], outputRange: [-7, 7] })}
          />
        </Animated.View>

        {/* the orbiting members */}
        {slots.map((item, i) => {
          const tr = tracks[i];
          const cat = item.category_id ? describeCategory(groups, item.category_id) : { label: '', slug: '' };
          const isFeatured = i === featuredIdx;
          const offer = item.kind === 'offer';
          const x = spin.interpolate({ inputRange: tr.input, outputRange: tr.xs });
          const y = spin.interpolate({ inputRange: tr.input, outputRange: tr.ys });
          const depthScale = spin.interpolate({ inputRange: tr.input, outputRange: tr.sc });
          const depthOpacity = spin.interpolate({ inputRange: tr.input, outputRange: tr.op });
          const accent = offer ? 'rgba(217,164,65,0.95)' : 'rgba(170,200,255,0.95)';
          return (
            <View key={i} style={[styles.abs, { width: AVATAR, height: AVATAR, zIndex: zs[i] }]}>
              {trails[i].map((t, j) => (
                <Animated.View
                  key={j}
                  pointerEvents="none"
                  style={[
                    styles.abs,
                    {
                      width: 10 - j * 2.5,
                      height: 10 - j * 2.5,
                      left: AVATAR / 2 - (10 - j * 2.5) / 2,
                      top: AVATAR / 2 - (10 - j * 2.5) / 2,
                      borderRadius: 6,
                      backgroundColor: offer ? 'rgba(255,214,120,1)' : 'rgba(160,190,255,1)',
                      boxShadow: `0 0 8px 2px ${offer ? 'rgba(217,164,65,0.7)' : 'rgba(120,150,255,0.7)'}`,
                      zIndex: 0,
                      opacity: Animated.multiply(
                        spin.interpolate({ inputRange: t.input, outputRange: t.op.map((o) => o * (0.55 - j * 0.15)) }),
                        scales[i],
                      ),
                      transform: [
                        { translateX: spin.interpolate({ inputRange: t.input, outputRange: t.xs }) },
                        { translateY: spin.interpolate({ inputRange: t.input, outputRange: t.ys }) },
                      ],
                    },
                  ]}
                />
              ))}
            <Animated.View
              key={i}
              style={[
                styles.abs,
                {
                  width: AVATAR,
                  height: AVATAR,
                  zIndex: 1,
                  opacity: Animated.multiply(depthOpacity, scales[i]),
                  transform: [
                    { translateX: reduceMotion ? tr.xs[0] : x },
                    { translateY: reduceMotion ? tr.ys[0] : y },
                    { scale: Animated.multiply(Animated.multiply(reduceMotion ? 1 : depthScale, scales[i]), boost[i]) },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => onOpen(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title ?? ''}
              >
                <View
                  style={[
                    styles.avatarFrame,
                    {
                      borderColor: accent,
                      boxShadow: isFeatured ? `0 0 22px 3px ${accent}` : `0 0 12px rgba(120,140,255,0.4)`,
                    },
                    isFeatured && { borderWidth: 3 },
                  ]}
                >
                  <Avatar path={item.photo} size={AVATAR - 6} />
                </View>
                <View style={[styles.badge, !offer && styles.badgeSeek]}>
                  <MaterialCommunityIcons
                    name={categoryIcon(cat.slug)}
                    size={12}
                    color={offer ? colors.onAccent : colors.text}
                  />
                </View>
              </Pressable>
            </Animated.View>
            </View>
          );
        })}
      </View>

      {/* introduction card for the selected member */}
      <Pressable
        onPress={() => featured && onOpen(featured)}
        style={styles.card}
        accessibilityRole="button"
      >
        {featured ? (
          <Animated.View style={[styles.cardInner, { opacity: fade }]}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name={categoryIcon(fCat.slug)} size={22} color={colors.accent} />
            </View>
            <View style={styles.cardText}>
              <AppText weight="bold" numberOfLines={1} style={styles.cardName}>
                {featured.title || '—'}
              </AppText>
              <AppText weight="medium" numberOfLines={1} style={styles.cardKind}>
                {featured.kind === 'offer' ? ka.feed.offers : ka.feed.seeks}: {fCat.label}
              </AppText>
              <View style={styles.cardCity}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <AppText muted numberOfLines={1} style={styles.cardCityText}>
                  {featured.city}
                  {featured.is_demo ? ` · ${ka.feed.demo}` : ''}
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
          </Animated.View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  title: { fontSize: 18, lineHeight: 26, alignSelf: 'flex-start' },
  abs: { position: 'absolute' },
  planet: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 34px 6px rgba(215,38,46,0.28), 0 0 34px 6px rgba(60,90,220,0.28)',
  },
  avatarFrame: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeSeek: { backgroundColor: colors.surface },
  card: {
    alignSelf: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(10,16,32,0.7)',
    padding: 12,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,164,65,0.14)',
  },
  cardText: { flex: 1, gap: 1 },
  cardName: { fontSize: 16, lineHeight: 22 },
  cardKind: { fontSize: 13, lineHeight: 18, color: colors.accent },
  cardCity: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardCityText: { fontSize: 12, lineHeight: 16 },
});
