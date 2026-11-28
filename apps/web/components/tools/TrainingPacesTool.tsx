'use client';

import { RaceResultPanel, useRaceResult } from './RaceResultInput';
import { formatPace, trainingPaces, type PaceRange } from '@/lib/tools/runMath';

const range = (r: PaceRange) => `${formatPace(r.low)} to ${formatPace(r.high)}`;

export function TrainingPacesTool() {
  const result = useRaceResult('5k', { h: '', m: '25', s: '00' });
  const { seconds, base } = result;
  const paces = seconds > 0 ? trainingPaces(seconds, base.km) : null;

  return (
    <div className="tool">
      <RaceResultPanel result={result} />

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
