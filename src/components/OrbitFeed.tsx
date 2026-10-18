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
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

const MAX_SLOTS = 6;
const AVATAR = 56;
const TICK_MS = 4200;
const PERIOD = 42000;
const STEPS = 48;

// Two crossing, tilted orbits (like an atom): three members on each, opposite directions.
const ORBITS = [
  { tilt: -17, dir: 1, ry: 0.36, r: 1 },
  { tilt: 17, dir: -1, ry: 0.36, r: 0.93 },
];
function slotOrbit(i: number) {
  const o = ORBITS[i % 2];
  const phase = Math.floor(i / 2) / 3 + (i % 2) * 0.17;
  return { ...o, phase };
}

/**
 * Members travel on two tilted, crossing 3D orbits around a glowing planet. Depth is faked:
 * members at the back are smaller and dimmer, members at the front larger and brighter.
 * Every few seconds one is replaced by a new member (taken in turn from the pool the server
 * picked fairly); the card below introduces whoever is selected.
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
  const H = S * 0.82;
  const slotsCount = Math.min(MAX_SLOTS, items.length);

  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [slots, setSlots] = useState<FeedItem[]>([]);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [zs, setZs] = useState<number[]>(() => Array(MAX_SLOTS).fill(1));

  const slotsRef = useRef<FeedItem[]>([]);
  const queueRef = useRef<FeedItem[]>([]);
  const tickRef = useRef(0);
  const t0 = useRef(Date.now());

  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
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
    rot.start();
    br.start();
    return () => {
      rot.stop();
      br.stop();
    };
  }, [active, reduceMotion, slotsCount, spin, breathe]);

  // Layering: whoever is nearer to the viewer is drawn on top (checked a few times a second).
  useEffect(() => {
    if (!active || reduceMotion || slotsCount === 0) return;
    const id = setInterval(() => {
      const u = ((Date.now() - t0.current) % PERIOD) / PERIOD;
      const next = Array.from({ length: MAX_SLOTS }, (_, i) => {
        const o = slotOrbit(i);
        const d = Math.sin(2 * Math.PI * (o.dir * u + o.phase));
        return Math.round((d + 1) * 50) + 1;
      });
      setZs((prev) => (prev.every((v, i) => Math.abs(v - next[i]) < 4) ? prev : next));
    }, 250);
    return () => clearInterval(id);
  }, [active, reduceMotion, slotsCount]);

  function showFeatured(idx: number) {
    fade.setValue(0);
    setFeaturedIdx(idx);
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }

  // Every few seconds: swap one member for a new one and introduce them.
  useEffect(() => {
    if (!active || slotsCount === 0) return;
    const timer = setInterval(() => {
      const k = tickRef.current % slotsCount;
      tickRef.current += 1;
      if (queueRef.current.length === 0) {
        showFeatured(k);
        return;
      }
      Animated.timing(scales[k], { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
        () => {
          const incoming = queueRef.current.shift()!;
          queueRef.current.push(slotsRef.current[k]);
          slotsRef.current[k] = incoming;
          setSlots(slotsRef.current.slice());
          showFeatured(k);
          Animated.spring(scales[k], { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
        },
      );
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, slotsCount, signature]);

  // Pre-computed keyframes of every orbit position: x, y, depth scale, depth opacity.
  const tracks = useMemo(() => {
    const input = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);
    return Array.from({ length: MAX_SLOTS }, (_, i) => {
      const o = slotOrbit(i);
      const T = (o.tilt * Math.PI) / 180;
      const rx = RX * o.r;
      const ry = rx * o.ry;
      const xs: number[] = [];
      const ys: number[] = [];
      const sc: number[] = [];
      const op: number[] = [];
      for (let k = 0; k <= STEPS; k++) {
        const th = 2 * Math.PI * (o.dir * (k / STEPS) + o.phase);
        const x0 = rx * Math.cos(th);
        const y0 = ry * Math.sin(th);
        const d = (Math.sin(th) + 1) / 2; // 0 far .. 1 near
        xs.push(x0 * Math.cos(T) - y0 * Math.sin(T));
        ys.push(x0 * Math.sin(T) + y0 * Math.cos(T));
        sc.push(0.58 + 0.5 * d);
        op.push(0.5 + 0.5 * d);
      }
      return { input, xs, ys, sc, op };
    });
  }, [RX]);

  if (slotsCount === 0) return null;

  const featured = slots[featuredIdx] ?? slots[0];
  const fCat = featured?.category_id ? describeCategory(groups, featured.category_id) : { label: '', slug: '' };
  const planetScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const planetGlow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const PLANET = 74;

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {ka.feed.title}
      </AppText>

      <View style={{ width: S, height: H, alignItems: 'center', justifyContent: 'center' }}>
        {/* soft light along both orbits (no lines) and a halo around the planet */}
        {ORBITS.map((o) => (
          <View key={o.tilt} style={[styles.abs, { transform: [{ rotate: `${o.tilt}deg` }] }]}>
            <Glow size={S * 0.98} squash={0.34} color={o.dir > 0 ? COSMOS.violet : COSMOS.teal} intensity={0.2} />
          </View>
        ))}
        <Animated.View style={[styles.abs, { opacity: planetGlow }]}>
          <Glow size={PLANET * 3.4} color={COSMOS.gold} intensity={0.32} />
        </Animated.View>

        {/* the planet */}
        <Animated.View style={[styles.planet, { width: PLANET, height: PLANET, transform: [{ scale: planetScale }], zIndex: 50 }]}>
          <MaterialCommunityIcons name={categoryIcon(fCat.slug)} size={28} color="rgba(255,244,214,0.95)" />
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
            <Animated.View
              key={i}
              style={[
                styles.abs,
                {
                  width: AVATAR,
                  height: AVATAR,
                  zIndex: isFeatured ? 100 : zs[i],
                  opacity: Animated.multiply(depthOpacity, scales[i]),
                  transform: [
                    { translateX: reduceMotion ? tr.xs[0] : x },
                    { translateY: reduceMotion ? tr.ys[0] : y },
                    { scale: Animated.multiply(reduceMotion ? 1 : depthScale, scales[i]) },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  tickRef.current = i + 1;
                  showFeatured(i);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.title ?? ''}
              >
                <View
                  style={[
                    styles.avatarFrame,
                    {
                      borderColor: accent,
                      boxShadow: isFeatured ? `0 0 26px 4px ${accent}` : `0 0 14px rgba(120,140,255,0.45)`,
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
    backgroundColor: '#C98F2E',
    boxShadow:
      'inset -14px -14px 24px rgba(40,18,0,0.75), inset 8px 8px 16px rgba(255,226,150,0.55), 0 0 40px 8px rgba(217,164,65,0.45)',
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
