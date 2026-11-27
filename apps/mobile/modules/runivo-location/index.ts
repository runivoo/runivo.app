/** JS side of the RunivoLocation native module (iOS anti-spoofing check). */
import { requireOptionalNativeModule } from 'expo';

interface Native { isLocationSimulated(): Promise<boolean | null> }

/**
 * Whether iOS says the current location is simulated by software: true, false,
 * or null when it can't tell. Null on Android (expo-location's `mocked` covers it
 * there) and on builds made before this module existed.
 */
export async function isLocationSimulated(): Promise<boolean | null> {
  try {
    const mod = requireOptionalNativeModule<Native>('RunivoLocation');
    if (!mod) return null;
    return await mod.isLocationSimulated();
  } catch {
    return null;
  }
}
