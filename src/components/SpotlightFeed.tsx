import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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

const BIG = 112;
const MINI = 40;
const MINI_ACTIVE = 50;
const ADVANCE_MS = 6500;
const PAUSE_AFTER_TOUCH_MS = 10000;

/**
 * One big spotlight member in the middle of a slowly swirling cosmic light, with the next
 * members lined up below as small faces. Every few seconds the next one slides in; swipe or
 * tap a small face to move yourself. The server picked the pool fairly, we only walk through it.
 * Phone numbers are never shown here: the button opens the profile.
 */
export function SpotlightFeed({
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
  const len = items.length;

  const [active, setActive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<FeedItem | null>(null);
  const [dir, setDir] = useState(1);

  const curRef = useRef(0);
  const lastTouch = useRef(0);
  const enter = useRef(new Animated.Value(1)).current;
  const ghostV = useRef(new Animated.Value(0)).current;
  const swirl = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const signature = items.map((i) => `${i.kind}-${i.ref_id}`).join('|');
  useEffect(() => {
    curRef.current = 0;
    setCur(0);
    setPrev(null);
    enter.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Swirling light: driven by the clock so it never stalls.
  useEffect(() => {
    if (!active || reduceMotion) return;
    let raf = 0;
    const frame = () => {
      const t = Date.now() / 1000;
      swirl.setValue((t / 28) % 1);
      breathe.setValue(0.5 + 0.5 * Math.sin((t / 4.5) * 2 * Math.PI));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, reduceMotion, swirl, breathe]);

  const goTo = useCallback(
    (target: number, direction: number) => {
      if (len < 2) return;
      const next = ((target % len) + len) % len;
      if (next === curRef.current) return;
      setPrev(items[curRef.current]);
      setDir(direction);
      curRef.current = next;
      setCur(next);
      enter.setValue(0);
      ghostV.setValue(1);
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 50, useNativeDriver: false }).start();
      Animated.timing(ghostV, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() =>
        setPrev(null),
      );
    },
    [items, len, enter, ghostV],
  );

  // Automatic advance (paused for a while after the person touches it).
  useEffect(() => {
    if (!active || len < 2) return;
    const id = setInterval(() => {
      if (Date.now() - lastTouch.current < PAUSE_AFTER_TOUCH_MS) return;
      goTo(curRef.current + 1, 1);
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, len, goTo, signature]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_e, g) => {
          lastTouch.current = Date.now();
          if (g.dx < -40) goTo(curRef.current + 1, 1);
          else if (g.dx > 40) goTo(curRef.current - 1, -1);
        },
      }),
    [goTo],
  );

  const item = items[cur];
  if (!item) return null;
  const cat = item.category_id ? describeCategory(groups, item.category_id) : { label: '', slug: '' };
  const offer = item.kind === 'offer';
  const accent = offer ? 'rgba(217,164,65,0.95)' : 'rgba(170,200,255,0.95)';

  const swirlRotate = swirl.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  const queue = Array.from({ length: Math.min(6, len) }, (_, j) => ({ it: items[(cur + j) % len], idx: (cur + j) % len, j }));

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {ka.feed.title}
      </AppText>

      <View {...pan.panHandlers} style={{ width: S, alignItems: 'center' }}>
        {/* spotlight */}
        <View style={{ width: S, height: 230, alignItems: 'center', justifyContent: 'center' }}>
          {/* cosmic light: a warm breathing core and two soft lights swirling around it */}
          <Animated.View style={[styles.abs, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}>
            <Glow size={S * 0.8} color={[255, 214, 140]} intensity={0.42} />
          </Animated.View>
          <Animated.View style={[styles.abs, { width: 0, height: 0, transform: [{ rotate: swirlRotate }] }]}>
            <View style={[styles.abs, { left: -S * 0.5 + 10, top: -S * 0.28 }]}>
              <Glow size={S * 0.56} color={COSMOS.violet} intensity={0.5} />
            </View>
            <View style={[styles.abs, { left: S * 0.5 - S * 0.56 - 10, top: S * 0.28 - S * 0.56 }]}>
              <Glow size={S * 0.56} color={COSMOS.teal} intensity={0.4} />
            </View>
            <View style={[styles.abs, { left: -S * 0.12, top: -S * 0.5 }]}>
              <Glow size={S * 0.4} color={[215, 38, 46]} intensity={0.34} />
            </View>
            <View style={[styles.abs, { left: -S * 0.28, top: S * 0.5 - S * 0.4 }]}>
              <Glow size={S * 0.4} color={[70, 100, 255]} intensity={0.34} />
            </View>
          </Animated.View>

          {/* previous member sliding out */}
          {prev ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.abs,
                {
                  opacity: ghostV,
                  transform: [
                    { translateX: ghostV.interpolate({ inputRange: [0, 1], outputRange: [-dir * 60, 0] }) },
                    { scale: ghostV.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                  ],
                },
              ]}
            >
              <BigAvatar item={prev} groups={groups} />
            </Animated.View>
          ) : null}

          {/* current member sliding in */}
          <Animated.View
            style={[
              styles.abs,
              {
                opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [dir * 70, 0] }) },
                  { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                ],
              },
            ]}
          >
            <Pressable
              onPress={() => {
                lastTouch.current = Date.now();
                onOpen(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={item.title ?? ''}
            >
              <BigAvatar item={item} groups={groups} />
            </Pressable>
          </Animated.View>
        </View>

        {/* who it is */}
        <Animated.View style={[styles.info, { opacity: enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.2, 1] }) }]}>
          <AppText weight="bold" numberOfLines={1} style={styles.name}>
            {item.title || '—'}
          </AppText>
          <AppText weight="medium" numberOfLines={2} style={styles.kind}>
            {offer ? ka.feed.offers : ka.feed.seeks}: {cat.label}
          </AppText>
          <View style={styles.city}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <AppText muted numberOfLines={1} style={styles.cityText}>
              {item.city}
              {item.is_demo ? ` · ${ka.feed.demo}` : ''}
            </AppText>
          </View>
          <Pressable
            onPress={() => {
              lastTouch.current = Date.now();
              onOpen(item);
            }}
            style={[styles.openBtn, { borderColor: accent }]}
            accessibilityRole="button"
          >
            <AppText weight="bold" style={styles.openText}>
              {ka.feed.open}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </Pressable>
        </Animated.View>
      </View>

      {/* next members, as small faces */}
      {len > 1 ? (
        <View style={styles.queue}>
          {queue.map(({ it, idx, j }) => {
            const o = it.kind === 'offer';
            const size = j === 0 ? MINI_ACTIVE : MINI;
            return (
              <Pressable
                key={`${it.kind}-${it.ref_id}`}
                onPress={() => {
                  lastTouch.current = Date.now();
                  goTo(idx, 1);
                }}
                accessibilityRole="button"
                accessibilityLabel={it.title ?? ''}
                style={{ opacity: j === 0 ? 1 : 0.85 - j * 0.08 }}
              >
                <View
                  style={[
                    styles.miniFrame,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      borderColor: o ? 'rgba(217,164,65,0.9)' : 'rgba(170,200,255,0.9)',
                      borderWidth: j === 0 ? 3 : 1.5,
                      boxShadow: j === 0 ? '0 0 16px 2px rgba(217,164,65,0.55)' : '0 0 8px rgba(120,140,255,0.3)',
                    },
                  ]}
                >
                  <Avatar path={it.photo} size={size - 6} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function BigAvatar({ item, groups }: { item: FeedItem; groups: CategoryGroup[] }) {
  const cat = item.category_id ? describeCategory(groups, item.category_id) : { label: '', slug: '' };
  const offer = item.kind === 'offer';
  return (
    <View style={[styles.big, { borderColor: offer ? 'rgba(217,164,65,0.95)' : 'rgba(170,200,255,0.95)' }]}>
      <Avatar path={item.photo} size={BIG - 10} />
      <View style={[styles.badge, !offer && styles.badgeSeek]}>
        <MaterialCommunityIcons name={categoryIcon(cat.slug)} size={18} color={offer ? colors.onAccent : colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  title: { fontSize: 18, lineHeight: 26, alignSelf: 'center', textAlign: 'center', color: colors.accent },
  abs: { position: 'absolute' },
  big: {
    width: BIG,
    height: BIG,
    borderRadius: BIG / 2,
    borderWidth: 3,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 34px 5px rgba(217,164,65,0.5)',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeSeek: { backgroundColor: colors.surface },
  info: { alignItems: 'center', gap: 2, minHeight: 112, paddingHorizontal: 8 },
  name: { fontSize: 20, lineHeight: 28, color: colors.accent, textAlign: 'center' },
  kind: { fontSize: 14, lineHeight: 20, color: 'rgba(240,215,160,0.92)', textAlign: 'center' },
  city: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cityText: { fontSize: 12, lineHeight: 16 },
  openBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: 'rgba(19,28,46,0.6)',
  },
  openText: { fontSize: 14, lineHeight: 20, color: colors.accent },
  queue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, minHeight: MINI_ACTIVE + 6 },
  miniFrame: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
