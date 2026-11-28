'use client';

import { useId } from 'react';

/** Hours, minutes and seconds as three number fields. Empty means zero. */
export function TimeFields({
  label, value, onChange, hours = true,
}: { label: string; value: { h: string; m: string; s: string }; onChange: (v: { h: string; m: string; s: string }) => void; hours?: boolean }) {
  const id = useId();
  const set = (k: 'h' | 'm' | 's') => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value.replace(/\D/g, '').slice(0, 3) });
  const parts: ['h' | 'm' | 's', string][] = hours ? [['h', 'hours'], ['m', 'minutes'], ['s', 'seconds']] : [['m', 'minutes'], ['s', 'seconds']];
  return (
    <fieldset style={{ border: 0 }}>
      <legend className="field-label">{label}</legend>
      <div className={`tool-row${hours ? '' : ' two'}`}>
        {parts.map(([k, unit]) => (
          <div key={k}>
            <input
              id={`${id}-${k}`} className="field" inputMode="numeric" placeholder="0" value={value[k]} onChange={set(k)}
              aria-label={`${label}, ${unit}`}
            />
            <div className="tool-unit">{unit}</div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export const secondsOf = (v: { h: string; m: string; s: string }): number => (Number(v.h) || 0) * 3600 + (Number(v.m) || 0) * 60 + (Number(v.s) || 0);
