import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Stars } from '@/components/Stars';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

type Props = {
  name: string;
  photoPath: string | null;
  labels: string[];
  city: string;
  priceNote: string | null;
  bio: string;
  mine?: boolean;
  mineLabel?: string;
  rating?: { avg: number; cnt: number } | null;
  demo?: boolean;
  online?: boolean;
  businessName?: string | null;
  onPress: () => void;
};

export function ProviderCard({ name, photoPath, labels, city, priceNote, bio, mine, mineLabel, rating, demo, online, businessName, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.top}>
        <Avatar path={photoPath} size={56} />
        <View style={styles.head}>
          <AppText weight="bold" numberOfLines={1} style={styles.name}>
            {name}
            {mine && mineLabel ? `  ·  ${mineLabel}` : ''}
            {demo ? `  ·  ${ka.feed.demo}` : ''}
          </AppText>
          <AppText muted numberOfLines={1} style={styles.small}>
            {labels.join(', ')}
          </AppText>
          {rating ? (
            <View style={styles.meta}>
              <Stars value={rating.avg} size={13} />
              <AppText muted style={styles.small}>
                {rating.avg.toFixed(1)} ({rating.cnt})
              </AppText>
            </View>
          ) : null}
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <AppText muted numberOfLines={1} style={styles.small}>
              {city}
              {online ? `  ·  ${ka.state.onlineBadge}` : ''}
            </AppText>
          </View>
          {businessName ? (
            <View style={styles.meta}>
              <Ionicons name="storefront-outline" size={14} color={colors.accent} />
              <AppText numberOfLines={1} style={[styles.small, { color: colors.accent }]}>
                {businessName}
              </AppText>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      <AppText numberOfLines={2} style={styles.bio}>
        {bio}
      </AppText>

      {priceNote ? (
        <View style={styles.price}>
          <AppText weight="medium" style={styles.priceText}>
            {priceNote}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  head: { flex: 1, gap: 2 },
  name: { fontSize: 17, lineHeight: 26 },
  small: { fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bio: { fontSize: 15, lineHeight: 24 },
  price: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: { color: colors.accent, fontSize: 13, lineHeight: 18 },
});
