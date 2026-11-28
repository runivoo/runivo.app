/** The running glossary: short, plain definitions. Each has an anchor on /glossary. */

export interface Term {
  term: string;
  id: string;
  definition: string;
  /** Internal links worth following: [label, href]. */
  links?: [string, string][];
}

const t = (term: string, definition: string, links?: [string, string][]): Term => ({
  term, id: term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), definition, links,
});

export const TERMS: Term[] = [
  t('Aerobic base', 'The fitness you build by running a lot at an easy effort. A strong base lets you run longer and recover faster, and it is what faster training sits on.', [['Why most runs should feel slow', '/blog/easy-runs-slow-pace']]),
  t('Auto-pause', 'A setting that stops the clock when you stop moving, for example at a crossing, and restarts it when you move again.', [['Run tracking', '/features/run-tracking']]),
  t('Cadence', 'How many steps you take per minute. It changes with pace, so there is no single right number, and most people should not try to force a big change.'),
  t('Cooldown', 'Easy jogging or walking at the end of a run or hard session, to let your heart rate come down gradually.'),
  t('Cross-training', 'Exercise other than running, such as cycling, swimming or strength work, that builds fitness with less impact on your legs.', [['Strength and mobility in plans', '/features/training-plans']]),
  t('Easy run', 'A run at a comfortable pace you could hold a conversation at. Most of your weekly running should be easy.', [['Easy runs, explained', '/blog/easy-runs-slow-pace'], ['Training pace calculator', '/tools/training-paces']]),
  t('Elevation gain', 'The total height you climb during a run, added up over every uphill. Hills slow your pace even when the effort is the same.'),
  t('Fartlek', 'Swedish for "speed play": an unstructured run where you speed up and slow down by feel, for example sprinting to the next lamp post, then jogging.'),
  t('Half marathon', 'A race of 21.0975 km (13.1 miles).', [['Pacing a half marathon', '/blog/pace-a-half-marathon']]),
  t('Interval training', 'Repeated bursts of faster running separated by easy jogging or walking, such as six repeats of three minutes hard with two minutes easy.', [['Tempo runs and intervals', '/blog/tempo-runs-and-intervals-explained']]),
  t('Lactate threshold', 'Roughly the fastest pace you can hold before fatigue builds quickly. Tempo runs train it, which lets you hold a harder pace for longer.', [['Tempo runs and intervals', '/blog/tempo-runs-and-intervals-explained']]),
  t('Long run', 'The longest run of your week, usually at an easy pace. It builds endurance and teaches your body to keep going when tired.'),
  t('Negative split', 'Running the second half of a run or race faster than the first. It comes from starting a little slower than you could.', [['Pacing a half marathon', '/blog/pace-a-half-marathon']]),
  t('Pace', 'How long it takes you to cover a distance, usually written as minutes and seconds per kilometre, for example 5:30 /km.', [['Pace calculator', '/tools/pace-calculator']]),
  t('PACE (Runivo)', 'Runivo’s reward points. You earn PACE by running and spend it in the PACE Store. It is free to earn and cannot be bought, sold or cashed out.', [['PACE and the PACE Store', '/features/pace-rewards'], ['What PACE is', '/blog/what-is-pace-and-the-pace-store']]),
  t('PaceX', 'Runivo’s AI running coach. It reads your runs and gives a debrief, a weekly review and answers to your questions. It is off until you agree.', [['PaceX AI coach', '/features/ai-coach']]),
  t('Personal record (PR)', 'Your best time for a distance, such as your fastest 5K. Also called a personal best (PB).'),
  t('Plan', 'A schedule of runs across weeks that builds toward a goal, such as a race, with easy, long and hard sessions.', [['Training plans', '/features/training-plans']]),
  t('Recovery run', 'A short, very easy run the day after a hard session, to loosen your legs without adding stress.'),
  t('Recovery week', 'A week with less running, often 20 to 30% less, placed every three or four weeks so your body can absorb the training.', [['Why every fourth week should be lighter', '/blog/recovery-weeks']]),
  t('Rest day', 'A day with no running, so your muscles and tendons can rebuild stronger.'),
  t('RPE (rate of perceived exertion)', 'A 1 to 10 scale for how hard a run feels. Easy running is around 3 or 4, tempo around 7, and hard intervals 8 or 9.'),
  t('Splits', 'Your time for each kilometre (or mile) of a run. Even splits mean a steady pace; negative splits mean speeding up.'),
  t('Strides', 'Short, relaxed accelerations of 15 to 20 seconds, with walking in between, usually after an easy run. They keep your legs quick without tiring you.'),
  t('Taper', 'Cutting back your running in the last one to three weeks before a race so you arrive fresh.', [['10K plan guide', '/blog/build-a-10k-training-plan']]),
  t('Talk test', 'A simple check on effort: if you can speak in full sentences while running, you are at an easy pace.', [['Easy runs, explained', '/blog/easy-runs-slow-pace']]),
  t('Tempo run', 'A sustained run at a "comfortably hard" effort, about the pace you could hold for an hour in a race.', [['Tempo runs and intervals', '/blog/tempo-runs-and-intervals-explained'], ['Training pace calculator', '/tools/training-paces']]),
  t('VO2 max', 'The most oxygen your body can use per minute during hard exercise. It is one measure of aerobic fitness, and it is only part of what decides how fast you run.'),
  t('Warm-up', 'Easy walking, jogging and light movement before a run or hard session, to get your body ready.'),
  t('Zone (Runivo)', 'The area Runivo draws along a route you run on foot. Run through it again to keep it fresh; it fades if you do not.', [['Zones', '/features/zones']]),
].sort((a, b) => a.term.localeCompare(b.term));
