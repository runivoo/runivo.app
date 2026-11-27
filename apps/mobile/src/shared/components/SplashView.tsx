import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MARK_PATH, MARK_RADIUS } from './RunivoMark';
import { Fonts } from '@theme';

/**
 * Launch screen while the app checks the session.
 *
 * The native launch screen (assets/splash-icon.png, 280 pt wide) shows a faint
 * hexagon outline at exactly this size and place, so this starts where it ends:
 * the amber line fills the outline (one stroke, clockwise from the top), then
 * "runivo" and "Run more." fade in beneath it. One screen, no blank frame. It
 * stays at least MIN_SHOW_MS so the moment reads, then fades into the app.
 */
const HEX_SIZE = 168;          // 168 of the launch image's 280 pt: same size as the native frame
const OUTLINE = '#FBE5C4';     // the faint outline both screens show first
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
        <Path d={MARK_PATH} fill="none" stroke={OUTLINE} strokeWidth={STROKE} strokeLinejoin="round" />
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
  // The hexagon stays dead centre (where the native frame put it); the words sit under it.
  words: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: HEX_SIZE * 0.31 + 22, alignItems: 'center' },
  wordmark: { fontFamily: Fonts.wordmark, fontSize: 30, letterSpacing: 1, color: '#17181A' },
  tagline: { fontFamily: Fonts.wordmark, fontSize: 16, marginTop: 8, color: '#6B6E68' },
});
