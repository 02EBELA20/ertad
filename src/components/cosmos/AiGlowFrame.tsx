import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, ViewStyle } from 'react-native';

function gradient(css: string): ViewStyle {
  return (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;
}

/**
 * "AI" frame: a bright multicolour light runs around the border, with a soft glow outside.
 * The inner content sits on its own dark surface. `focused` makes the glow stronger.
 */
export function AiGlowFrame({ children, focused, radius = 26 }: { children: ReactNode; focused?: boolean; radius?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const on = true;

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const frame = () => {
      const t = Date.now() / 1000;
      spin.setValue((t / 6) % 1);
      breathe.setValue(0.5 + 0.5 * Math.sin((t / 3.2) * 2 * Math.PI));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [on, spin, breathe]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: focused ? [0.8, 1] : [0.45, 0.8] });

  return (
    <View style={{ borderRadius: radius }}>
      {/* outer glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            opacity: glowOpacity,
            boxShadow: '0 0 22px 2px rgba(120,100,255,0.45), 0 0 46px 6px rgba(70,200,230,0.22), 0 0 30px 0 rgba(217,164,65,0.22)',
          },
        ]}
      />
      {/* running light along the border */}
      <View style={{ borderRadius: radius, overflow: 'hidden', padding: focused ? 2 : 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(120,130,200,0.35)' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: 900, height: 900, transform: [{ rotate }] },
            gradient(
              'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 38%, rgba(110,90,255,1) 46%, rgba(70,210,235,1) 52%, rgba(217,164,65,1) 58%, rgba(255,255,255,0) 66%, rgba(255,255,255,0) 100%)',
            ),
          ]}
        />
        <View style={{ alignSelf: 'stretch', borderRadius: radius - 2, backgroundColor: '#0E1628', overflow: 'hidden' }}>{children}</View>
      </View>
    </View>
  );
}
