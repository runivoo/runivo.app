'use client';

import { useId, useState } from 'react';
import { TimeFields, secondsOf } from './TimeFields';
import { RACES, distanceFrom, formatDuration, formatPace, paceFrom, speedKmh, timeFrom } from '@/lib/runMath';

type Solve = 'pace' | 'time' | 'distance';
const MODES: [Solve, string][] = [['pace', 'Pace'], ['time', 'Finish time'], ['distance', 'Distance']];

export function PaceCalculator() {
  const [solve, setSolve] = useState<Solve>('pace');
  const [km, setKm] = useState('5');
  const [time, setTime] = useState({ h: '', m: '25', s: '00' });
  const [pace, setPace] = useState({ h: '', m: '5', s: '00' });
  const kmId = useId();

  const distance = parseFloat(km.replace(',', '.'));
  const seconds = secondsOf(time);
  const paceSec = secondsOf({ ...pace, h: '' });
  const okDist = Number.isFinite(distance) && distance > 0;

  let headline = '—';
  let note = 'Fill in the fields to see your answer.';
  let speedNote = '';
  if (solve === 'pace' && okDist && seconds > 0) {
    const p = paceFrom(seconds, distance);
    headline = `${formatPace(p)} /km`;
    note = `${formatDuration(seconds)} over ${distance} km.`;
    speedNote = `${speedKmh(p).toFixed(1)} km/h`;
  } else if (solve === 'time' && okDist && paceSec > 0) {
    const t = timeFrom(paceSec, distance);
    headline = formatDuration(t);
    note = `${distance} km at ${formatPace(paceSec)} per km.`;
    speedNote = `${speedKmh(paceSec).toFixed(1)} km/h`;
  } else if (solve === 'distance' && paceSec > 0 && seconds > 0) {
    const d = distanceFrom(paceSec, seconds);
    headline = `${d.toFixed(2)} km`;
    note = `${formatDuration(seconds)} at ${formatPace(paceSec)} per km.`;
    speedNote = `${speedKmh(paceSec).toFixed(1)} km/h`;
  }

  return (
    <div className="tool">
      <div className="card tool-panel">
        <div className="tool-form">
          <div>
            <p className="field-label">Find your</p>
            <div className="seg" role="group" aria-label="What to calculate">
              {MODES.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={solve === id} onClick={() => setSolve(id)}>{label}</button>
              ))}
            </div>
          </div>

          {solve !== 'distance' && (
            <div>
              <label className="field-label" htmlFor={kmId}>Distance (km)</label>
              <input id={kmId} className="field" inputMode="decimal" value={km} onChange={e => setKm(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))} />
              <div className="seg" style={{ marginTop: 10 }} role="group" aria-label="Common distances">
                {RACES.map(r => (
                  <button key={r.id} type="button" aria-pressed={parseFloat(km) === r.km} onClick={() => setKm(String(r.km))}>{r.label}</button>
                ))}
              </div>
            </div>
          )}
          {solve !== 'time' && <TimeFields label="Time" value={time} onChange={setTime} />}
          {solve !== 'pace' && <TimeFields label="Pace per km" value={pace} onChange={v => setPace({ ...v, h: '' })} hours={false} />}
        </div>
      </div>

      <div className="result" role="status" aria-live="polite">
        <p className="eyebrow">{solve === 'pace' ? 'Your pace' : solve === 'time' ? 'Your finish time' : 'Your distance'}</p>
        <p className="result-big">{headline}</p>
        <p className="result-note">{note}{speedNote ? ` That is ${speedNote}.` : ''}</p>
      </div>
    </div>
  );
}
