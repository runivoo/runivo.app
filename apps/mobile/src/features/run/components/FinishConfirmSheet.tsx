import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Fonts, type AppColors } from '@theme';
import { convertKm } from '@mobile/shared/lib/formatters';
import { ModalSheet } from '@mobile/shared/components/ModalSheet';
import { PrimaryButton } from '@mobile/shared/components/PrimaryButton';

function fmt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

interface FinishConfirmSheetProps {
  distance: number;
  elapsed: number;
  /** "run" / "walk" / "ride" — names the activity in the title. */
  verb?: string;
  /** Display unit; distance stays km-native. */
  unit?: 'km' | 'mi';
  onKeepRunning: () => void;
  onFinish: () => void;
}

/** "Finish run?" on the app's one bottom sheet, with the app's buttons. */
export default function FinishConfirmSheet({
  distance, elapsed, verb = 'run', unit = 'km', onKeepRunning, onFinish,
}: FinishConfirmSheetProps) {
  const C = useTheme();
  const ss = useMemo(() => mkStyles(C), [C]);
  return (
    <ModalSheet visible onClose={onKeepRunning}>
      <Text style={ss.title}>Finish {verb}?</Text>
      <Text style={ss.sub}>{convertKm(distance, unit).toFixed(2)} {unit} · {fmt(elapsed)}</Text>
      <View style={ss.actions}>
        <PrimaryButton label="Keep going" variant="surface" onPress={onKeepRunning} style={ss.action} />
        <PrimaryButton label="Finish" onPress={onFinish} style={ss.action} />
      </View>
    </ModalSheet>
  );
}

function mkStyles(C: AppColors) {
  return StyleSheet.create({
    title:   { fontFamily: Fonts.bold, fontSize: 18, color: C.black, textAlign: 'center', marginBottom: 8 },
    sub:     { fontFamily: Fonts.regular, fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 24, fontVariant: ['tabular-nums'] },
    actions: { flexDirection: 'row', gap: 12 },
    action:  { flex: 1 },
  });
}
