import { Alert, Platform } from 'react-native';

/** Cross-platform confirm dialog (Alert.alert does nothing on web). */
export function confirmAction(opts: {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
}) {
  const { title, message, confirmText, cancelText, onConfirm } = opts;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}
