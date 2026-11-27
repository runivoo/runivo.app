import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MARK_PATH, MARK_RADIUS } from './RunivoMark';
import { Fonts } from '@theme';

/**
 * Launch screen while the app checks the session.
 *
 * The native launch screen is plain white (assets/splash-icon.png is blank),
 * so this picks up from an empty screen: the thin amber hexagon draws itself
 * (one stroke, clockwise from the top), then "runivo" and "Run more." fade in
 * beneath it. It stays at least MIN_SHOW_MS so the moment reads, then fades
 * into the app once the session is known.
 */
const HEX_SIZE = 112;
const STROKE = 3.5;
const PERIMETER = 6 * MARK_RADIUS; // a regular hexagon's side equals its radius
const DRAW_MS = 700;
const TEXT_DELAY_MS = 450;
const TEXT_MS = 350;
const MIN_SHOW_MS = 1300;
const FADE_MS = 260;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  ready: boolean;
  onLayout?: () => void;
  onHidden?: () => void;
}

export function SplashView({ ready, onLayout, onHidden }: Props) {
  const draw = useRef(new Animated.Value(PERIMETER)).current;
  const text = useRef(new Animated.Value(0)).current;
  const root = useRef(new Animated.Value(1)).current;
  const [minShown, setMinShown] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(draw, { toValue: 0, duration: DRAW_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(text, { toValue: 1, duration: TEXT_MS, delay: TEXT_DELAY_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setMinShown(true), MIN_SHOW_MS);
    return () => clearTimeout(t);
  }, [draw, text]);

  useEffect(() => {
    if (!ready || !minShown) return;
    Animated.timing(root, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true })
      .start(({ finished }) => { if (finished) onHidden?.(); });
  }, [ready, minShown, root, onHidden]);

  const rise = text.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

  return (
    <Animated.View style={[s.root, { opacity: root }]} onLayout={onLayout} accessibilityLabel="Runivo. Run more." accessible>
      <Svg width={HEX_SIZE} height={HEX_SIZE} viewBox="0 0 100 100">
        <AnimatedPath
          d={MARK_PATH}
          fill="none"
          stroke="#F2A43A"
          strokeWidth={STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={`${PERIMETER} ${PERIMETER}`}
          strokeDashoffset={draw}
        />
      </Svg>
      <Animated.View style={[s.words, { opacity: text, transform: [{ translateY: rise }] }]}>
        <Text style={s.wordmark}>runivo</Text>
        <Text style={s.tagline}>Run more.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  words: { alignItems: 'center', marginTop: 4 },
  wordmark: { fontFamily: Fonts.wordmark, fontSize: 30, letterSpacing: 1, color: '#17181A' },
  tagline: { fontFamily: Fonts.wordmark, fontSize: 16, marginTop: 8, color: '#6B6E68' },
});
