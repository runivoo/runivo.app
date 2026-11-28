'use client';

import { useState } from 'react';
import { TimeFields, secondsOf } from './TimeFields';
import { RACES, formatPace, trainingPaces, type PaceRange, type RaceId } from '@/lib/runMath';

const range = (r: PaceRange) => `${formatPace(r.low)} to ${formatPace(r.high)}`;

export function TrainingPacesTool() {
  const [from, setFrom] = useState<RaceId>('5k');
  const [time, setTime] = useState({ h: '', m: '25', s: '00' });
  const seconds = secondsOf(time);
  const base = RACES.find(r => r.id === from)!;
  const paces = seconds > 0 ? trainingPaces(seconds, base.km) : null;

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
        <p className="eyebrow">Paces per kilometre</p>
        {paces ? (
          <table className="result-table">
            <caption className="sr-only">Training paces per kilometre</caption>
            <tbody>
              <tr><th scope="row">Easy and long runs</th><td>{range(paces.easy)}</td></tr>
              <tr><th scope="row">Tempo</th><td>{range(paces.tempo)}</td></tr>
              <tr><th scope="row">Intervals</th><td>{range(paces.interval)}</td></tr>
            </tbody>
          </table>
        ) : <p className="result-note">Enter a time to see your paces.</p>}
        <p className="result-note">Starting points only. On hot days or hills, go by effort: easy should pass the talk test.</p>
      </div>
    </div>
  );
}
