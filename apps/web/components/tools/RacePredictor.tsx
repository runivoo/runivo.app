'use client';

import { RaceResultPanel, useRaceResult } from './RaceResultInput';
import { RACES, formatDuration, formatPace, paceFrom, predictTime } from '@/lib/tools/runMath';

export function RacePredictor() {
  const result = useRaceResult('10k', { h: '', m: '50', s: '00' });
  const { from, seconds, base } = result;

  return (
    <div className="tool">
      <RaceResultPanel result={result} />

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
