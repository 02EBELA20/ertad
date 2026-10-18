import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Stars } from '@/components/Stars';
import { submitReview } from '@/lib/reviews';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export function ReviewSheet({
  visible,
  onClose,
  conversationId,
  otherName,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  otherName?: string | null;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (done) onDone();
    setStars(0);
    setNote('');
    setDone(false);
    setError(null);
    onClose();
  }

  async function send() {
    if (stars < 1 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitReview(conversationId, stars, note);
      setDone(true);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      setError(msg.includes('already_reviewed') ? ka.review.already : ka.review.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {done ? (
            <>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={32} color={colors.accent} />
              </View>
              <AppText weight="bold" style={styles.title}>
                {ka.review.thanks}
              </AppText>
              <AppButton title={ka.safety.close} onPress={close} />
            </>
          ) : (
            <>
              <AppText weight="bold" style={styles.title}>
                {ka.review.title(otherName ?? '')}
              </AppText>
              <View style={styles.starsWrap}>
                <Stars value={stars} onChange={setStars} size={38} />
              </View>
              <TextInput
                value={note}
                onChangeText={(t) => setNote(t.slice(0, 300))}
                placeholder={ka.review.notePlaceholder}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.note}
              />
              <AppText muted style={styles.small}>
                {ka.review.publicHint}
              </AppText>
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <AppButton title={ka.review.send} onPress={send} loading={busy} disabled={stars < 1} />
              <AppButton variant="ghost" title={ka.cancel} onPress={close} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  title: { fontSize: 20, lineHeight: 30, textAlign: 'center' },
  starsWrap: { alignItems: 'center', paddingVertical: 8 },
  note: {
    minHeight: 80,
    maxHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'NotoSansGeorgian_400Regular',
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
    textAlignVertical: 'top',
  },
  small: { fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  doneIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
