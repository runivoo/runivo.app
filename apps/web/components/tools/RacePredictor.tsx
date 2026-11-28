'use client';

import { useState } from 'react';
import { TimeFields, secondsOf } from './TimeFields';
import { RACES, formatDuration, formatPace, paceFrom, predictTime, type RaceId } from '@/lib/runMath';

export function RacePredictor() {
  const [from, setFrom] = useState<RaceId>('10k');
  const [time, setTime] = useState({ h: '', m: '50', s: '00' });
  const seconds = secondsOf(time);
  const base = RACES.find(r => r.id === from)!;

  return (
    <div className="tool">
      <div className="card tool-panel">
        <div className="tool-form">
          <div>
            <p className="field-label">Your recent result over</p>
            <div className="seg" role="group" aria-label="Distance of your result">
              {RACES.map(r => <button key={r.id} type="button" aria-pressed={from === r.id} onClick={() => setFrom(r.id)}>{r.label}</button>)}
            </div>
          </div>
          <TimeFields label="Your time" value={time} onChange={setTime} />
        </div>
      </div>

      <div className="result" role="status" aria-live="polite">
        <p className="eyebrow">Estimated times</p>
        {seconds > 0 ? (
          <table className="result-table">
            <caption className="sr-only">Predicted race times</caption>
            <tbody>
              {RACES.map(r => {
                const t = r.id === from ? seconds : predictTime(seconds, base.km, r.km);
                return (
                  <tr key={r.id}>
                    <th scope="row">{r.label}</th>
                    <td>{formatDuration(t)} <span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 400 }}>· {formatPace(paceFrom(t, r.km))}/km</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="result-note">Enter a time to see your estimates.</p>}
        <p className="result-note">Estimates assume you have trained for each distance. Longer races from short results are often optimistic.</p>
      </div>
    </div>
  );
}
