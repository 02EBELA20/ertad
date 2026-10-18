import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
const AVATAR = 54;
const SPOT = 86; // size of the spotlight avatar in the middle
const PERIOD = 40000; // one full turn of the ring
const HOLD_MS = 1700; // how long a member glows at the front before flying to the middle
const STEPS = 48;
const TILT = -7; // degrees: a slight tilt makes the ring feel like a real 3D plane
const RY = 0.5; // ring flattening (3D look)
const OY = 30; // the ring sits a bit lower than the middle so it passes under the spotlight text

/**
 * A 3D ring of people turning around a spotlight. The member who comes to the front glows,
 * then flies into the middle and opens up as the spotlight (tap it to open the profile). The
 * previous spotlight member fades away, and the empty place on the ring is taken by a new
 * member from the pool the server picked fairly.
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
  const H = S * 0.84;
  const n = Math.min(MAX_SLOTS, Math.max(0, items.length - 1));

  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [slots, setSlots] = useState<FeedItem[]>([]);
  const [center, setCenter] = useState<FeedItem | null>(null);
  const [ghost, setGhost] = useState<FeedItem | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0, s: 0.6 });
  const [front, setFront] = useState(0);
  const [zs, setZs] = useState<number[]>(() => Array(MAX_SLOTS).fill(1));

  const slotsRef = useRef<FeedItem[]>([]);
  const queueRef = useRef<FeedItem[]>([]);
  const centerRef = useRef<FeedItem | null>(null);
  const frontRef = useRef(-1);
  const frontSince = useRef(Date.now());
  const promoted = useRef(false);
  const busy = useRef(false);
  const t0 = useRef(Date.now());

  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const ghostV = useRef(new Animated.Value(0)).current;
  const boost = useRef(Array.from({ length: MAX_SLOTS }, () => new Animated.Value(1))).current;
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

  const phaseOf = useCallback((i: number) => i / Math.max(1, n), [n]);

  // (Re)initialise when the server sends a new set.
  const signature = items.map((i) => `${i.kind}-${i.ref_id}`).join('|');
  useEffect(() => {
    centerRef.current = items[0] ?? null;
    slotsRef.current = items.slice(1, 1 + n);
    queueRef.current = items.slice(1 + n);
    frontRef.current = -1;
    promoted.current = false;
    busy.current = false;
    setCenter(centerRef.current);
    setGhost(null);
    setSlots(slotsRef.current.slice());
    pop.setValue(1);
    scales.forEach((v) => v.setValue(0));
    Animated.stagger(
      110,
      scales.slice(0, n).map((v) => Animated.spring(v, { toValue: 1, friction: 6, tension: 70, useNativeDriver: false })),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Endless orbit: driven by the clock on every frame, so it can never stall or drift.
  useEffect(() => {
    if (!active || reduceMotion || n === 0) return;
    let raf = 0;
    const frame = () => {
      const now = Date.now();
      spin.setValue(((now - t0.current) % PERIOD) / PERIOD);
      breathe.setValue(0.5 + 0.5 * Math.sin((now / 4800) * 2 * Math.PI));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, reduceMotion, n, spin, breathe]);

  /** Where slot i is right now (offset from the middle) and how big it looks. */
  const placeOf = useCallback(
    (i: number, u: number) => {
      const T = (TILT * Math.PI) / 180;
      const th = 2 * Math.PI * (u + phaseOf(i));
      const x0 = RX * Math.cos(th);
      const y0 = RX * RY * Math.sin(th);
      const d = (Math.sin(th) + 1) / 2;
      return {
        x: x0 * Math.cos(T) - y0 * Math.sin(T),
        y: x0 * Math.sin(T) + y0 * Math.cos(T) + OY,
        s: 0.48 + 0.84 * d,
        depth: Math.sin(th),
      };
    },
    [RX, phaseOf],
  );

  function promote(k: number) {
    busy.current = true;
    promoted.current = true;
    const u = reduceMotion ? 0 : ((Date.now() - t0.current) % PERIOD) / PERIOD;
    const p = placeOf(k, u);
    const flying = slotsRef.current[k];
    const old = centerRef.current;

    setOrigin({ x: p.x, y: p.y + 30, s: Math.max(0.3, (p.s * AVATAR) / SPOT) });
    if (old) {
      queueRef.current.push(old);
      setGhost(old);
      ghostV.setValue(1);
      Animated.timing(ghostV, { toValue: 0, duration: 450, useNativeDriver: false }).start(() => setGhost(null));
    }
    centerRef.current = flying;
    setCenter(flying);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 45, useNativeDriver: false }).start();

    // the place it left is taken by a new member after a moment
    scales[k].setValue(0);
    setTimeout(() => {
      const incoming = queueRef.current.shift();
      if (incoming) {
        slotsRef.current[k] = incoming;
        setSlots(slotsRef.current.slice());
        Animated.spring(scales[k], { toValue: 1, friction: 6, tension: 70, useNativeDriver: false }).start();
      }
      busy.current = false;
    }, 650);
  }

  // Several times a second: layering, who is in front, and when to promote the glowing member.
  useEffect(() => {
    if (!active || n === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      const u = reduceMotion ? 0 : ((now - t0.current) % PERIOD) / PERIOD;
      let best = 0;
      let bestDepth = -2;
      const next = Array.from({ length: MAX_SLOTS }, (_, i) => {
        if (i >= n) return 1;
        const d = placeOf(i, u).depth;
        if (d > bestDepth) {
          bestDepth = d;
          best = i;
        }
        return Math.round((d + 1) * 50) + 1;
      });
      setZs((prev) => (prev.every((v, i) => Math.abs(v - next[i]) < 4) ? prev : next));

      if (best !== frontRef.current) {
        frontRef.current = best;
        frontSince.current = now;
        promoted.current = false;
        setFront(best);
        boost.forEach((v, k) =>
          Animated.spring(v, { toValue: k === best ? 1.14 : 1, friction: 6, tension: 60, useNativeDriver: false }).start(),
        );
      }
      if (!reduceMotion && !promoted.current && !busy.current && now - frontSince.current > HOLD_MS) {
        promote(best);
      }
    }, 140);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion, n, signature, placeOf]);

  // Pre-computed keyframes of every orbit position.
  const tracks = useMemo(() => {
    const input = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);
    return Array.from({ length: MAX_SLOTS }, (_, i) => {
      const xs: number[] = [];
      const ys: number[] = [];
      const sc: number[] = [];
      const op: number[] = [];
      for (let k = 0; k <= STEPS; k++) {
        const p = placeOf(i, k / STEPS);
        xs.push(p.x);
        ys.push(p.y);
        sc.push(p.s);
        op.push(0.45 + 0.55 * ((p.depth + 1) / 2));
      }
      return { input, xs, ys, sc, op };
    });
  }, [placeOf]);

  if (!center) return null;

  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {ka.feed.title}
      </AppText>

      <View style={{ width: S, height: H, alignItems: 'center', justifyContent: 'center' }}>
        {/* soft light behind the spotlight: warm in the middle, Georgia-red left, America-blue right */}
        <Animated.View style={[styles.abs, { opacity: haloOpacity }]}>
          <Glow size={S * 0.95} squash={0.9} color={[255, 214, 140]} intensity={0.3} />
        </Animated.View>
        <Animated.View style={[styles.abs, { opacity: haloOpacity, transform: [{ translateX: -S * 0.2 }] }]}>
          <Glow size={S * 0.7} squash={0.9} color={[215, 38, 46]} intensity={0.34} />
        </Animated.View>
        <Animated.View style={[styles.abs, { opacity: haloOpacity, transform: [{ translateX: S * 0.2 }] }]}>
          <Glow size={S * 0.7} squash={0.9} color={[70, 100, 255]} intensity={0.34} />
        </Animated.View>

        {/* previous spotlight, fading away */}
        {ghost ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.abs,
              {
                zIndex: 49,
                opacity: ghostV,
                transform: [{ scale: ghostV.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
              },
            ]}
          >
            <Spotlight item={ghost} groups={groups} />
          </Animated.View>
        ) : null}

        {/* the spotlight: flies in from its place on the ring and opens up */}
        <Animated.View
          style={[
            styles.abs,
            {
              zIndex: 50,
              opacity: pop.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.2, 1, 1] }),
              transform: [
                { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [origin.x, 0] }) },
                { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [origin.y, 0] }) },
                { scale: Animated.multiply(pop.interpolate({ inputRange: [0, 1], outputRange: [origin.s, 1] }), breatheScale) },
              ],
            },
          ]}
        >
          <Pressable onPress={() => onOpen(center)} accessibilityRole="button" accessibilityLabel={center.title ?? ''}>
            <Spotlight item={center} groups={groups} />
          </Pressable>
        </Animated.View>

        {/* the ring */}
        {slots.map((item, i) => {
          const tr = tracks[i];
          const cat = item.category_id ? describeCategory(groups, item.category_id) : { label: '', slug: '' };
          const isFront = i === front;
          const offer = item.kind === 'offer';
          const x = spin.interpolate({ inputRange: tr.input, outputRange: tr.xs });
          const y = spin.interpolate({ inputRange: tr.input, outputRange: tr.ys });
          const depthScale = spin.interpolate({ inputRange: tr.input, outputRange: tr.sc });
          const depthOpacity = spin.interpolate({ inputRange: tr.input, outputRange: tr.op });
          const accent = offer ? 'rgba(217,164,65,0.95)' : 'rgba(170,200,255,0.95)';
          return (
            <View key={i} style={[styles.abs, { width: AVATAR, height: AVATAR, zIndex: zs[i] }]}>
              <Animated.View
                style={[
                  styles.abs,
                  {
                    width: AVATAR,
                    height: AVATAR,
                    opacity: Animated.multiply(depthOpacity, scales[i]),
                    transform: [
                      { translateX: reduceMotion ? tr.xs[0] : x },
                      { translateY: reduceMotion ? tr.ys[0] : y },
                      { scale: Animated.multiply(Animated.multiply(reduceMotion ? 1 : depthScale, scales[i]), boost[i]) },
                    ],
                  },
                ]}
              >
                <Pressable onPress={() => onOpen(item)} accessibilityRole="button" accessibilityLabel={item.title ?? ''}>
                  <View
                    style={[
                      styles.avatarFrame,
                      {
                        borderColor: accent,
                        boxShadow: isFront ? `0 0 22px 3px ${accent}` : '0 0 12px rgba(120,140,255,0.4)',
                      },
                      isFront && { borderWidth: 3 },
                    ]}
                  >
                    <Avatar path={item.photo} size={AVATAR - 6} />
                  </View>
                  <View style={[styles.badge, !offer && styles.badgeSeek]}>
                    <MaterialCommunityIcons name={categoryIcon(cat.slug)} size={12} color={offer ? colors.onAccent : colors.text} />
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The big introduction in the middle: photo, name, what they offer or look for, city. */
function Spotlight({ item, groups }: { item: FeedItem; groups: CategoryGroup[] }) {
  const cat = item.category_id ? describeCategory(groups, item.category_id) : { label: '', slug: '' };
  const offer = item.kind === 'offer';
  return (
    <View style={styles.spot}>
      <View style={[styles.spotAvatar, { borderColor: offer ? 'rgba(217,164,65,0.95)' : 'rgba(170,200,255,0.95)' }]}>
        <Avatar path={item.photo} size={SPOT - 8} />
        <View style={[styles.spotBadge, !offer && styles.badgeSeek]}>
          <MaterialCommunityIcons name={categoryIcon(cat.slug)} size={16} color={offer ? colors.onAccent : colors.text} />
        </View>
      </View>
      <View style={styles.spotText}>
        <AppText weight="bold" numberOfLines={1} style={styles.spotName}>
          {item.title || '—'}
        </AppText>
        <AppText weight="medium" numberOfLines={1} style={styles.spotKind}>
          {item.kind === 'offer' ? ka.feed.offers : ka.feed.seeks}: {cat.label}
        </AppText>
        <View style={styles.spotCity}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <AppText muted numberOfLines={1} style={styles.spotCityText}>
            {item.city}
            {item.is_demo ? ` · ${ka.feed.demo}` : ''}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  title: { fontSize: 18, lineHeight: 26, alignSelf: 'center', textAlign: 'center', color: colors.accent },
  abs: { position: 'absolute' },
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
  spot: { alignItems: 'center', gap: 8, maxWidth: 250 },
  spotAvatar: {
    width: SPOT,
    height: SPOT,
    borderRadius: SPOT / 2,
    borderWidth: 3,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px 4px rgba(217,164,65,0.55)',
  },
  spotBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  spotText: {
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(8,13,26,0.6)',
  },
  spotName: { fontSize: 16, lineHeight: 22, color: colors.accent, textAlign: 'center' },
  spotKind: { fontSize: 12, lineHeight: 17, color: 'rgba(240,215,160,0.92)', textAlign: 'center' },
  spotCity: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  spotCityText: { fontSize: 11, lineHeight: 15 },
});
