import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { UserActionsSheet } from '@/components/UserActionsSheet';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/auth/AuthProvider';
import {
  MAX_MESSAGE,
  Message,
  Peer,
  fetchMessages,
  fetchPeer,
  markRead,
  sendMessage,
} from '@/lib/chat';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id ?? '';

  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // newest first
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!id) throw new Error('no id');
        const [p, list] = await Promise.all([fetchPeer(id), fetchMessages(id)]);
        if (!alive) return;
        if (!p) {
          setState('missing');
          return;
        }
        setPeer(p);
        setMessages(list);
        setState('ready');
        markRead(id);
      } catch {
        if (alive) setState('missing');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Live incoming messages for this conversation.
  useEffect(() => {
    if (!id || !me) return;
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
          if (m.sender_id !== me) markRead(id);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, me]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, [router]);

  async function onSend() {
    const body = text.trim();
    if (!body || sending || !id) return;
    setSending(true);
    setSendError(null);
    try {
      const m = await sendMessage(id, me, body);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
      setText('');
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      setSendError(
        msg.includes('rate_limited')
          ? ka.chat.tooFast
          : msg.includes('daily_limit')
            ? ka.chat.dailyLimit
            : ka.chat.sendFailed,
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={ka.categories.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {peer ? (
          <Pressable
            style={styles.peer}
            onPress={() => router.push({ pathname: '/provider/[id]', params: { id: peer.other_id } })}
            accessibilityRole="button"
          >
            <Avatar path={peer.other_photo} size={36} />
            <AppText weight="bold" numberOfLines={1} style={styles.peerName}>
              {peer.other_name || '—'}
            </AppText>
          </Pressable>
        ) : null}
        {peer ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={ka.safety.report}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {peer ? (
        <UserActionsSheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          me={me}
          otherId={peer.other_id}
          otherName={peer.other_name}
          conversationId={id}
          isBlocked={peer.i_blocked}
          onBlockChange={(b) => setPeer({ ...peer, i_blocked: b })}
        />
      ) : null}

      {state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : state === 'missing' ? (
        <View style={styles.center}>
          <AppText muted>{ka.chat.notFound}</AppText>
          <AppButton variant="secondary" title={ka.categories.back} onPress={goBack} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            style={styles.flex}
            inverted
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messages}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppText muted style={styles.emptyText}>
                  {ka.chat.sayHi}
                </AppText>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === me;
              return (
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <AppText style={mine ? styles.textMine : undefined}>{item.body}</AppText>
                    <AppText style={[styles.meta, mine ? styles.metaMine : { color: colors.textMuted }]}>
                      {hhmm(item.created_at)}
                    </AppText>
                  </View>
                </View>
              );
            }}
          />

          {sendError ? (
            <AppText style={styles.error}>{sendError}</AppText>
          ) : null}

          {peer?.i_blocked ? (
            <View style={styles.blockedBar}>
              <AppText muted>{ka.safety.blockedBanner}</AppText>
              <Pressable onPress={() => setMenuOpen(true)} accessibilityRole="button">
                <AppText weight="medium" style={styles.unblockLink}>
                  {ka.safety.unblock}
                </AppText>
              </Pressable>
            </View>
          ) : (
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.slice(0, MAX_MESSAGE))}
              placeholder={ka.chat.placeholder}
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
              onKeyPress={(e) => {
                // Web: Enter sends, Shift+Enter makes a new line.
                const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Pressable
              onPress={onSend}
              disabled={sending || text.trim().length === 0}
              style={[styles.send, (sending || text.trim().length === 0) && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel={ka.chat.send}
            >
              <Ionicons name="arrow-up" size={22} color={colors.onAccent} />
            </Pressable>
          </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  peer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  peerName: { flex: 1, fontSize: 18, lineHeight: 26 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  messages: { padding: 16, gap: 8 },
  emptyWrap: { paddingVertical: 40, alignItems: 'center', transform: [{ scaleY: -1 }] },
  emptyText: { textAlign: 'center', maxWidth: 260 },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  textMine: { color: colors.onAccent },
  meta: { fontSize: 11, lineHeight: 16, marginTop: 2, alignSelf: 'flex-end' },
  metaMine: { color: colors.onAccent, opacity: 0.7 },
  error: { color: colors.danger, paddingHorizontal: 16, paddingBottom: 6, fontSize: 14, lineHeight: 20 },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  unblockLink: { color: colors.accent, textDecorationLine: 'underline' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'NotoSansGeorgian_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
