/**
 * Every word and number in the landing page's scroll story (components/city). The numbers follow the
 * app's real rules (docs/WEBSITE_CLAIMS.md): lib/city/timeline.test.ts checks them against the engine.
 * The people, distances and balance are an illustrated example, and the story says so.
 */

export const CITY_ECONOMY = {
  /** PACE for each whole kilometre; the five coins on the route are five kilometres. */
  perKm: 2,
  kmCoins: 5,
  /** PACE for a new zone, and for taking a rival's zone back. */
  newZone: 5,
  stolenZone: 10,
  /** What the example runner already has before the run. */
  exampleBalance: 120,
} as const;

export const CITY_COPY = {
  h1: 'Runivo: run smarter with an AI running coach',
  illustration: 'Illustrated example. Names and numbers are made up.',
  thought: [
    ['Every run begins as a thought.', 'Long before the first step.'],
    ['Five more minutes in bed? Or…', 'The snooze button is undefeated.'],
    ['…what if I just go?', 'Plot twist.'],
  ],
  scroll: 'Scroll',
  track: { eyebrow: 'Track', title: 'And just like that, it’s a run.', lead: 'Every step, logged. Even the walking bits. We won’t tell.', stats: ['Distance, km', 'Time', 'Avg pace /km'] },
  claim: { eyebrow: 'Claim', title: 'Close a loop. Own what’s inside.', lead: 'Run a loop of at least 300 m and everything inside becomes your zone, with your name on it.', rule: 'Zones fade if you stay away. Come back to keep them.' },
  pacex: { eyebrow: 'PaceX', title: 'Meet PaceX. Your AI running agent.', lead: 'A coach that never says “just one more.”', card: 'After your run', checks: ['Steady start, no early surge', 'Pace locked at 5:44 /km', 'Today’s goal: done'] },
  store: {
    eyebrow: 'PACE Store', title: 'Kilometres in. Rewards out.', lead: 'Every run earns PACE. Spend it on partner rewards in selected cities.',
    run: 'PACE this run', balance: 'Example balance', hintMouse: 'Click a coin. Go on.', hintTouch: 'Tap a coin. Go on.',
    note: 'Examples. Real rewards switch on city by city as partners join.',
    rewards: [
      { kind: 'Example reward', name: 'Running shoes, 20% off', cost: 75 },
      { kind: 'Example reward', name: 'Free gait analysis', cost: 250 },
    ],
  },
  friends: { eyebrow: 'Friends', title: 'You’re never running alone.', lead: 'See friends run live. Send kudos. Peer pressure, but wholesome.', hint: 'Go on, give Aanya some kudos' },
  rivals: { eyebrow: 'Rivals', title: 'Someone took your street? Take it back.', lead: 'Rivals can claim the ground you run. Run it again, close the loop, and it’s yours.' },
  final: { eyebrow: 'Opening city by city', facts: ['Free', 'iPhone first', 'One city at a time'], title: 'More than running.', accent: 'Run smarter.', lead: 'Runivo is almost at the start line. Get on the list before your friends do.' },
  tags: {
    zone: `New zone claimed · +${CITY_ECONOMY.newZone} PACE`,
    pace: '5:44 /km',
    done: '5 km done',
    kudos: 'Kudos sent to Aanya',
    back: 'Aanya cheered you back',
    rahul: 'Rahul · 3.1 km',
    mei: 'Mei · 10 km',
    kabir: 'Kabir’s zone',
    taken: `Zone taken back · +${CITY_ECONOMY.stolenZone} PACE`,
  },
  friend: { name: 'Aanya', meta: '6.2 km · 5:31 /km', live: 'Live', kudos: 'Kudos', cheer: 'Cheer', kudosStart: 12 },
  reward: { redeem: 'Redeem', redeemed: 'Redeemed', done: 'Redeemed. Enjoy.', can: 'You can redeem this', toGo: 'PACE to go' },
} as const;
