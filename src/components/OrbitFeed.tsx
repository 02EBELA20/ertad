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
const AVATAR = 58;
const TICK_MS = 4200;

/**
 * Members orbit around a glowing ring. Every few seconds one of them is replaced by a new
 * member (taken in turn from the pool the server picked fairly), and the centre introduces
 * whoever just arrived. Tap a member to see them in the centre, tap the centre to open.
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
  const S = Math.min(width - 40, 380);
  const R = S / 2 - AVATAR / 2 - 8;
  const slotsCount = Math.min(MAX_SLOTS, items.length);

  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [slots, setSlots] = useState<FeedItem[]>([]);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  const slotsRef = useRef<FeedItem[]>([]);
  const queueRef = useRef<FeedItem[]>([]);
  const tickRef = useRef(0);

  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
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
      110,
      scales.slice(0, slotsCount).map((v) =>
        Animated.spring(v, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Endless slow rotation + breathing glow.
  useEffect(() => {
    if (!active || reduceMotion || slotsCount === 0) return;
    const rot = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 80000, easing: Easing.linear, useNativeDriver: true }),
    );
    const glow = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    rot.start();
    glow.start();
    return () => {
      rot.stop();
      glow.stop();
    };
  }, [active, reduceMotion, slotsCount, spin, pulse]);

  function showFeatured(idx: number) {
    fade.setValue(0);
    setFeaturedIdx(idx);
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }

  // Every few seconds: swap one member for a new one and introduce them in the centre.
  useEffect(() => {
    if (!active || slotsCount === 0) return;
    const timer = setInterval(() => {
      const k = tickRef.current % slotsCount;
      tickRef.current += 1;
      if (queueRef.current.length === 0) {
        showFeatured(k);
        return;
      }
      Animated.timing(scales[k], { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
        () => {
          const incoming = queueRef.current.shift()!;
          queueRef.current.push(slotsRef.current[k]);
          slotsRef.current[k] = incoming;
          setSlots(slotsRef.current.slice());
          showFeatured(k);
          Animated.spring(scales[k], { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
        },
      );
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, slotsCount, signature]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const positions = useMemo(
    () =>
      Array.from({ length: slotsCount }, (_, i) => {
        const a = (-90 + (360 / slotsCount) * i) * (Math.PI / 180);
        return { left: S / 2 + R * Math.cos(a) - AVATAR / 2, top: S / 2 + R * Math.sin(a) - AVATAR / 2 };
      }),
    [S, R, slotsCount],
  );

  if (slotsCount === 0) return null;

  const featured = slots[featuredIdx] ?? slots[0];
  const fCat = featured?.category_id ? describeCategory(groups, featured.category_id) : { label: '', slug: '' };
  const innerD = 2 * (R - AVATAR / 2 - 12);

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {ka.feed.title}
      </AppText>

      <View style={[styles.stage, { width: S, height: S }]}>
        {/* galaxy: core glow and slowly turning nebula arms (no lines, only light) */}
        <View style={[styles.abs, { left: 0, top: 0, width: S, height: S, alignItems: 'center', justifyContent: 'center' }]}>
          <Glow size={S * 1.05} color={COSMOS.violet} intensity={0.22} />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[styles.abs, { left: 0, top: 0, width: S, height: S, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: counter }] }]}
        >
          {[
            { deg: 0, color: COSMOS.violet },
            { deg: 60, color: COSMOS.teal },
            { deg: 120, color: COSMOS.magenta },
          ].map((arm) => (
            <View key={arm.deg} style={[styles.abs, { transform: [{ rotate: `${arm.deg}deg` }] }]}>
              <Glow size={S * 0.98} squash={0.26} color={arm.color} intensity={0.3} />
            </View>
          ))}
        </Animated.View>
        <View style={[styles.abs, { left: 0, top: 0, width: S, height: S, alignItems: 'center', justifyContent: 'center' }]}>
          <Glow size={innerD * 1.5} color={COSMOS.gold} intensity={0.28} />
        </View>

        {/* the orbiting members */}
        <Animated.View style={[styles.abs, { width: S, height: S, transform: [{ rotate }] }]}>
          {slots.map((item, i) => {
            const cat = item.category_id ? describeCategory(groups, item.category_id) : { label: '', slug: '' };
            const isFeatured = i === featuredIdx;
            const offer = item.kind === 'offer';
            return (
              <View key={i} style={[styles.abs, { left: positions[i].left, top: positions[i].top, width: AVATAR, height: AVATAR }]}>
                <View style={[styles.abs, { left: -AVATAR * 0.65, top: -AVATAR * 0.65 }]}>
                  <Glow size={AVATAR * 2.3} color={offer ? COSMOS.gold : COSMOS.blue} intensity={isFeatured ? 0.6 : 0.34} />
                </View>
                {isFeatured ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.pulseFill, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
                  />
                ) : null}
                <Animated.View style={{ transform: [{ rotate: counter }, { scale: scales[i] }] }}>
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
                        { borderColor: offer ? 'rgba(217,164,65,0.9)' : 'rgba(210,225,255,0.9)' },
                        isFeatured && styles.avatarFeatured,
                      ]}
                    >
                      <Avatar path={item.photo} size={AVATAR - 6} />
                    </View>
                    <View style={[styles.badge, !offer && styles.badgeSeek]}>
                      <MaterialCommunityIcons
                        name={categoryIcon(cat.slug)}
                        size={13}
                        color={offer ? colors.onAccent : colors.text}
                      />
                    </View>
                  </Pressable>
                </Animated.View>
              </View>
            );
          })}
        </Animated.View>

        {/* centre: introduces the featured member */}
        <Pressable
          onPress={() => featured && onOpen(featured)}
          style={[styles.center, { width: innerD, height: innerD, borderRadius: innerD / 2 }]}
          accessibilityRole="button"
        >
          {featured ? (
            <Animated.View style={[styles.centerInner, { opacity: fade }]}>
              <View style={styles.centerIcon}>
                <MaterialCommunityIcons name={categoryIcon(fCat.slug)} size={22} color={colors.accent} />
              </View>
              <AppText weight="bold" numberOfLines={1} style={styles.centerName}>
                {featured.title || '—'}
              </AppText>
              <AppText weight="medium" numberOfLines={2} style={styles.centerKind}>
                {featured.kind === 'offer' ? ka.feed.offers : ka.feed.seeks}: {fCat.label}
              </AppText>
              <View style={styles.centerCity}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <AppText muted numberOfLines={1} style={styles.centerCityText}>
                  {featured.city}
                </AppText>
              </View>
              {featured.is_demo ? (
                <AppText muted style={styles.demo}>
                  {ka.feed.demo}
                </AppText>
              ) : null}
            </Animated.View>
          ) : null}
        </Pressable>
      </View>

      <AppText muted style={styles.hint}>
        {ka.feed.hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  title: { fontSize: 18, lineHeight: 26, alignSelf: 'flex-start' },
  stage: { alignItems: 'center', justifyContent: 'center' },
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
  avatarFeatured: {
    borderWidth: 3,
    boxShadow: '0 0 18px rgba(217,164,65,0.7)',
  },
  pulseFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.accent,
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeSeek: { backgroundColor: colors.surface },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,13,26,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 10,
    boxShadow: '0 0 40px rgba(217,164,65,0.22)',
  },
  centerInner: { alignItems: 'center', gap: 3, maxWidth: '100%' },
  centerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,164,65,0.12)',
  },
  centerName: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  centerKind: { fontSize: 12, lineHeight: 17, textAlign: 'center', color: colors.accent },
  centerCity: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  centerCityText: { fontSize: 12, lineHeight: 16 },
  demo: { fontSize: 10, lineHeight: 13 },
  hint: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
