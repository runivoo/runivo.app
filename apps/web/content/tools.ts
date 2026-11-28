/** The words around each free tool. The calculators themselves are in components/tools. */

export interface ToolPage {
  slug: 'pace-calculator' | 'race-time-predictor' | 'training-paces';
  title: string;
  description: string;
  h1: string;
  lead: string;
  /** Short paragraphs under the tool: how the numbers are worked out and their limits. */
  method: { heading: string; paragraphs: string[] };
  faqs: [string, string][];
  guides: string[];
  updated: string;
}

export const TOOL_PAGES: ToolPage[] = [
  {
    slug: 'pace-calculator',
    title: 'Running pace calculator',
    description: 'Free running pace calculator. Work out your pace per kilometre, your finish time or your distance from the other two, and see your speed in km/h.',
    h1: 'Running pace calculator',
    lead: 'Work out pace, time or distance from the other two. Pick what you want to find and fill in the rest.',
    method: {
      heading: 'How it works',
      paragraphs: [
        'Pace is time divided by distance. A 5K in 25:00 is 1,500 seconds over 5 km, or 5:00 per kilometre. Speed in km/h is 3,600 divided by your pace in seconds per kilometre.',
        'The result assumes you hold the same pace all the way. Real runs vary with hills, weather and how you feel, so use the answer as a target and not a guarantee.',
      ],
    },
    faqs: [
      ['How do I turn pace into speed?', 'Divide 3,600 by your pace in seconds per kilometre. A 6:00 pace is 360 seconds, so 3,600 ÷ 360 = 10 km/h.'],
      ['What is a good running pace?', 'It depends on you. A pace you can hold while talking is an easy pace, whatever the number. Compare yourself with your own past runs.'],
      ['Why does my watch show a different distance?', 'GPS has small errors, and races are measured along the shortest path. See how GPS tracking works.'],
    ],
    guides: ['how-gps-run-tracking-works', 'pace-a-half-marathon'],
    updated: '2026-11-28',
  },
  {
    slug: 'race-time-predictor',
    title: 'Race time predictor',
    description: 'Free race time predictor. Enter one recent result and see estimated times for a 5K, 10K, half marathon and marathon, with the pace for each.',
    h1: 'Race time predictor',
    lead: 'Enter a recent race or a hard time trial and see what it suggests for other distances.',
    method: {
      heading: 'How it works',
      paragraphs: [
        'The predictor uses Riegel’s formula: new time = old time × (new distance ÷ old distance) ^ 1.06. The exponent is slightly above 1 because you slow down a little as the distance grows.',
        'It works best when the two distances are not far apart, such as 10K to a half marathon, and when you have trained for the longer distance. A marathon prediction from a 5K assumes you have done the long runs, so it is often optimistic. Hot weather, hills and a first attempt at a distance can add minutes.',
      ],
    },
    faqs: [
      ['How accurate is it?', 'It is a good estimate for runners who have trained for the distance, and an optimistic one for a long race from a short result. Treat it as a ceiling.'],
      ['Which result should I enter?', 'A recent race or a hard, evenly paced effort within the last couple of months. Do not use an easy run.'],
      ['Why is the marathon time so fast?', 'The formula does not know how many long runs you have done. Marathon training changes the result more than any formula.'],
    ],
    guides: ['pace-a-half-marathon', 'build-a-10k-training-plan'],
    updated: '2026-11-28',
  },
  {
    slug: 'training-paces',
    title: 'Training pace calculator',
    description: 'Free training pace calculator. Turn a race result into easy, tempo and interval pace ranges per kilometre so each run has the right effort.',
    h1: 'Training pace calculator',
    lead: 'Turn a recent race result into easy, tempo and interval paces, so each session has the right effort.',
    method: {
      heading: 'How it works',
      paragraphs: [
        'We estimate your 10K and 5K pace from your result with Riegel’s formula, then add or subtract rules of thumb: easy is your 10K pace plus 60 to 90 seconds per kilometre, tempo is 10K pace plus 10 to 20 seconds, and intervals are close to 5K pace.',
        'These ranges are starting points. Heat, hills and tiredness all slow you down. If a pace feels too hard on the day, slow down and go by effort: easy should pass the talk test.',
      ],
    },
    faqs: [
      ['What pace should my easy runs be?', 'Slow enough to hold a conversation. The range here is a starting point; on hot days or hills, go by effort.'],
      ['Do I need all three paces?', 'No. Most weeks need only one hard session. Keep the rest easy.'],
      ['Should I use a recent race?', 'Yes, a race or hard effort from the last couple of months. An older or easier result gives paces that are too slow.'],
    ],
    guides: ['easy-runs-slow-pace', 'tempo-runs-and-intervals-explained'],
    updated: '2026-11-28',
  },
];
