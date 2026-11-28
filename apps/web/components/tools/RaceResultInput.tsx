'use client';

import { useState } from 'react';
import { TimeFields, secondsOf } from './TimeFields';
import { RACES, type RaceId } from '@/lib/tools/runMath';

/** The state behind "a recent result over <distance> in <time>", shared by the race predictor and the training paces tool. */
export function useRaceResult(initialRace: RaceId, initialTime: { h: string; m: string; s: string }) {
  const [from, setFrom] = useState<RaceId>(initialRace);
  const [time, setTime] = useState(initialTime);
  return { from, setFrom, time, setTime, seconds: secondsOf(time), base: RACES.find(r => r.id === from)! };
}

/** The left-hand panel of those two tools: pick the distance, enter the time. */
export function RaceResultPanel({ result }: { result: ReturnType<typeof useRaceResult> }) {
  return (
    <div className="card tool-panel">
      <div className="tool-form">
        <div>
          <p className="field-label">Your recent result over</p>
          <div className="seg" role="group" aria-label="Distance of your result">
            {RACES.map(r => <button key={r.id} type="button" aria-pressed={result.from === r.id} onClick={() => result.setFrom(r.id)}>{r.label}</button>)}
          </div>
        </div>
        <TimeFields label="Your time" value={result.time} onChange={result.setTime} />
      </div>
    </div>
  );
}
