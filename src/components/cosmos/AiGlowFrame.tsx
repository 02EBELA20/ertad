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
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: focused ? [0.55, 0.85] : [0.25, 0.5] });

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
            boxShadow: '0 0 14px 0 rgba(120,100,255,0.32), 0 0 30px 2px rgba(70,200,230,0.14)',
          },
        ]}
      />
      {/* running light along the border */}
      <View style={{ borderRadius: radius, overflow: 'hidden', padding: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(120,130,200,0.35)' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: 900, height: 900, transform: [{ rotate }] },
            gradient(
              'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 38%, rgba(110,90,255,0.75) 46%, rgba(70,210,235,0.75) 52%, rgba(217,164,65,0.75) 58%, rgba(255,255,255,0) 66%, rgba(255,255,255,0) 100%)',
            ),
          ]}
        />
        <View style={{ alignSelf: 'stretch', borderRadius: radius - 2, backgroundColor: '#0E1628', overflow: 'hidden' }}>{children}</View>
      </View>
    </View>
  );
}
