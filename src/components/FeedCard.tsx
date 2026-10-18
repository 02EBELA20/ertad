import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { categoryIcon } from '@/lib/categoryIcons';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

/** Compact card for the home feed: who, what they offer or look for, where. */
export function FeedCard({
  kind,
  name,
  photoPath,
  categorySlug,
  categoryLabel,
  city,
  snippet,
  demo,
  onPress,
}: {
  kind: 'offer' | 'seek';
  name: string;
  photoPath: string | null;
  categorySlug: string;
  categoryLabel: string;
  city: string;
  snippet: string | null;
  demo?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.top}>
        <View>
          <Avatar path={photoPath} size={52} />
          <View style={styles.badge}>
            <MaterialCommunityIcons name={categoryIcon(categorySlug)} size={14} color={colors.onAccent} />
          </View>
        </View>
        <View style={styles.flex}>
          <AppText weight="bold" numberOfLines={1}>
            {name}
          </AppText>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <AppText muted numberOfLines={1} style={styles.small}>
              {city}
            </AppText>
          </View>
        </View>
      </View>

      <View style={[styles.kind, kind === 'seek' && styles.kindSeek]}>
        <AppText weight="medium" numberOfLines={1} style={[styles.kindText, kind === 'seek' && { color: colors.text }]}>
          {kind === 'offer' ? ka.feed.offers : ka.feed.seeks}: {categoryLabel}
        </AppText>
      </View>

      {snippet ? (
        <AppText muted numberOfLines={2} style={styles.snippet}>
          {snippet}
        </AppText>
      ) : null}

      {demo ? (
        <AppText muted style={styles.demo}>
          {ka.feed.demo}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    width: 250,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
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
    borderColor: colors.surface,
  },
  small: { fontSize: 13, lineHeight: 18 },
  kind: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kindSeek: { borderColor: colors.border, backgroundColor: colors.bg },
  kindText: { color: colors.accent, fontSize: 13, lineHeight: 18 },
  snippet: { fontSize: 14, lineHeight: 21 },
  demo: { fontSize: 11, lineHeight: 14 },
});
