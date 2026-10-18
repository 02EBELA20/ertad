import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avatarUrl } from '@/lib/provider';
import { demoAvatar } from '@/lib/demoAvatars';
import { colors } from '@/theme/colors';

export function Avatar({ path, uri, size = 64 }: { path?: string | null; uri?: string | null; size?: number }) {
  const demo = demoAvatar(path);
  const src = demo ? null : (uri ?? avatarUrl(path));
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {demo ? (
        <Image source={demo} style={{ width: size, height: size }} />
      ) : src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} />
      ) : (
        <Ionicons name="person" size={size * 0.5} color={colors.textMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
