import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { confirmAction } from '@/lib/confirm';
import { ReportReason, blockUser, reportUser, unblockUser } from '@/lib/chat';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

const REASONS: ReportReason[] = ['spam', 'abuse', 'scam', 'fake', 'other'];

type Step = 'menu' | 'report' | 'done';

/** Bottom-sheet menu for another user: report and block / unblock. */
export function UserActionsSheet({
  visible,
  onClose,
  me,
  otherId,
  otherName,
  conversationId,
  isBlocked,
  onBlockChange,
}: {
  visible: boolean;
  onClose: () => void;
  me: string;
  otherId: string;
  otherName?: string | null;
  conversationId?: string | null;
  isBlocked: boolean;
  onBlockChange: (blocked: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setStep('menu');
    setReason(null);
    setDetails('');
    setError(null);
    onClose();
  }

  async function submitReport() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reportUser({ reporterId: me, targetUserId: otherId, conversationId, reason, details });
      setStep('done');
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      setError(msg.includes('rate_limited') ? ka.safety.reportLimit : ka.safety.reportFailed);
    } finally {
      setBusy(false);
    }
  }

  function toggleBlock() {
    if (isBlocked) {
      (async () => {
        try {
          await unblockUser(me, otherId);
          onBlockChange(false);
          close();
        } catch {
          setError(ka.safety.actionFailed);
        }
      })();
      return;
    }
    confirmAction({
      title: ka.safety.blockTitle,
      message: ka.safety.blockMessage,
      confirmText: ka.safety.block,
      cancelText: ka.cancel,
      onConfirm: async () => {
        try {
          await blockUser(me, otherId);
          onBlockChange(true);
          close();
        } catch {
          setError(ka.safety.actionFailed);
        }
      },
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {step === 'menu' ? (
            <>
              {otherName ? (
                <AppText weight="bold" style={styles.title} numberOfLines={1}>
                  {otherName}
                </AppText>
              ) : null}
              <Pressable style={styles.item} onPress={() => setStep('report')} accessibilityRole="button">
                <Ionicons name="flag-outline" size={22} color={colors.text} />
                <AppText weight="medium">{ka.safety.report}</AppText>
              </Pressable>
              <Pressable style={styles.item} onPress={toggleBlock} accessibilityRole="button">
                <Ionicons name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'} size={22} color={isBlocked ? colors.text : colors.danger} />
                <AppText weight="medium" style={!isBlocked && { color: colors.danger }}>
                  {isBlocked ? ka.safety.unblock : ka.safety.block}
                </AppText>
              </Pressable>
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <AppButton variant="ghost" title={ka.cancel} onPress={close} />
            </>
          ) : step === 'report' ? (
            <>
              <AppText weight="bold" style={styles.title}>
                {ka.safety.reportTitle}
              </AppText>
              <View style={styles.reasons}>
                {REASONS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    style={[styles.reason, reason === r && styles.reasonOn]}
                    accessibilityRole="button"
                  >
                    <AppText weight="medium" style={[styles.reasonText, reason === r && { color: colors.onAccent }]}>
                      {ka.safety.reasons[r]}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={details}
                onChangeText={(t) => setDetails(t.slice(0, 500))}
                placeholder={ka.safety.detailsPlaceholder}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.details}
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              {busy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <AppButton title={ka.safety.send} onPress={submitReport} disabled={!reason} />
              )}
              <AppButton variant="ghost" title={ka.cancel} onPress={close} />
            </>
          ) : (
            <>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={32} color={colors.accent} />
              </View>
              <AppText weight="bold" style={styles.title}>
                {ka.safety.thanks}
              </AppText>
              <AppText muted style={styles.center}>
                {ka.safety.thanksHint}
              </AppText>
              <AppButton title={ka.safety.close} onPress={close} />
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
  title: { fontSize: 20, lineHeight: 30 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reasonOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  reasonText: { fontSize: 14, lineHeight: 20 },
  details: {
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
  center: { textAlign: 'center' },
});
