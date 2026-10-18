import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/auth/AuthProvider';
import { ConversationItem, fetchConversations } from '@/lib/chat';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ChatListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await fetchConversations();
      if (!alive.current) return;
      setItems(list);
      setState('ready');
    } catch {
      if (alive.current) setState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      load();
      return () => {
        alive.current = false;
      };
    }, [load]),
  );

  // New incoming messages refresh the list while the tab is open.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-list-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return (
    <Screen>
      <AppText weight="bold" style={styles.title}>
        {ka.tabs.chat}
      </AppText>

      {state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : state === 'error' ? (
        <View style={styles.center}>
          <AppText muted>{ka.chat.loadFailed}</AppText>
          <AppButton variant="secondary" title={ka.retry} onPress={load} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
          <AppText muted style={styles.emptyText}>
            {ka.chat.empty}
          </AppText>
          <AppButton title={ka.chat.findPros} onPress={() => router.push('/professionals')} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
              style={styles.row}
              accessibilityRole="button"
            >
              <Avatar path={item.other_photo} size={52} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <AppText weight="bold" numberOfLines={1} style={styles.name}>
                    {item.other_name || '—'}
                  </AppText>
                  <AppText muted style={styles.time}>
                    {timeLabel(item.last_at)}
                  </AppText>
                </View>
                <View style={styles.rowTop}>
                  <AppText
                    muted={item.unread === 0}
                    numberOfLines={1}
                    style={[styles.preview, item.unread > 0 && { color: colors.text }]}
                  >
                    {item.i_blocked ? ka.safety.blockedBanner : (item.last_body ?? '')}
                  </AppText>
                  {item.unread > 0 ? (
                    <View style={styles.badge}>
                      <AppText weight="bold" style={styles.badgeText}>
                        {item.unread > 9 ? '9+' : item.unread}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 38, marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { textAlign: 'center', maxWidth: 280 },
  list: { gap: 10, paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1 },
  time: { fontSize: 12, lineHeight: 18 },
  preview: { flex: 1, fontSize: 14, lineHeight: 20 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onAccent, fontSize: 12, lineHeight: 16 },
});
