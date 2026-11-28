import type { FeatureSlug } from './nav';

/**
 * The words on each /features/<slug> page. Short on purpose: what it does, the real numbers, the
 * answers people ask. Every line describes the app today (see docs/WEBSITE_CLAIMS.md for where each
 * number comes from). If something is off or unfinished it appears only as a plain "not yet" in an
 * FAQ answer. lib/content.test.ts scans this file for claims we must not make.
 */

export interface FeatureSection {
  heading: string;
  /** One line under the heading. */
  intro?: string;
  /** Titled lines: [title, text]. */
  items?: [string, string][];
  /** Plain lines, no title. */
  lines?: string[];
  /** A quiet link under the section: [text, path]. */
  link?: [string, string];
}

export interface Feature {
  slug: FeatureSlug;
  /** Page title without " — Runivo". 51 characters or fewer. */
  title: string;
  description: string;
  h1: string;
  lead: string;
  status: 'launch' | 'pilot';
  /** Three numbers, each [value, label]. */
  facts: [string, string][];
  sections: FeatureSection[];
  faqs: [string, string][];
  /** Slugs of blog posts and tools to link to. */
  guides: string[];
  tools: string[];
  related: FeatureSlug[];
  /** ISO date of the last edit to this page's content. */
  updated: string;
}

const UPDATED = '2026-11-28';

export const FEATURES: Record<FeatureSlug, Feature> = {
  'run-tracking': {
    slug: 'run-tracking',
    title: 'GPS run tracking for seven sports',
    description: 'Track runs, trail runs, walks, hikes, rides, wheelchair and stroller runs with GPS. Pace, splits, elevation, voice updates and a treadmill log.',
    h1: 'Track every run.',
    lead: 'GPS that keeps going with your screen locked, and tells you how you are doing out loud.',
    status: 'launch',
    facts: [['7', 'sports tracked with GPS'], ['Every km', 'a voice update, if you want it'], ['3', 'export formats']],
    sections: [
      {
        heading: 'Seven sports, plus the treadmill.',
        items: [
          ['On foot or wheelchair', 'Run, trail run, walk, hike, wheelchair and stroller run. These count towards zones and PACE.'],
          ['Ride', 'Tracked with speed in km/h. Rides do not claim zones or earn PACE.'],
          ['Treadmill', 'Logged by hand. It counts towards distance and goals.'],
        ],
      },
      {
        heading: 'While you run.',
        lines: [
          'GPS route, distance, pace, splits and elevation.',
          'Tracks with the screen locked, with live stats on your iPhone lock screen.',
          'Optional auto-pause, and voice updates each kilometre.',
        ],
      },
      {
        heading: 'Afterwards.',
        items: [
          ['Replay and share', 'Watch the run back on the map, or share a card of it.'],
          ['Saved routes and loops', 'Save a route, or ask for a loop of 3, 5, 8 or 10 km.'],
          ['Export', 'Download any run as GPX, CSV or GeoJSON.'],
          ['Shoes', 'Add each pair with a mileage limit and see how worn it is.'],
        ],
      },
    ],
    faqs: [
      ['Do rides and treadmill runs earn PACE?', 'No. Only on-foot and wheelchair sports earn PACE and claim zones.'],
      ['Can I use a heart-rate strap or a watch?', 'Runivo does not pair with Bluetooth heart-rate straps yet and has no Apple Watch app of its own. Garmin, COROS and Polar connections are not available yet.'],
      ['Is it on Android?', 'iPhone first. Android is on the roadmap.'],
    ],
    guides: ['how-gps-run-tracking-works', 'when-to-replace-running-shoes'],
    tools: ['pace-calculator'],
    related: ['training-plans', 'ai-coach', 'privacy-safety'],
    updated: UPDATED,
  },

  'ai-coach': {
    slug: 'ai-coach',
    title: 'PaceX: your AI running coach',
    description: 'PaceX reads every run and tells you what went well and what to work on, with a weekly review and answers on pace and recovery. Off until you say yes.',
    h1: 'A coach that reads every run.',
    lead: 'PaceX tells you what went well and what to do next. It is off until you read what it sends and say yes.',
    status: 'launch',
    facts: [['90 days', 'of your runs it looks at'], ['500 m', 'the shortest run that gets a debrief'], ['Never', 'your GPS routes, name or email']],
    sections: [
      {
        heading: 'Three ways to use it.',
        items: [
          ['A debrief after each run', 'What went well, what to look at and one thing to try next.'],
          ['A weekly review', 'A headline for your week, three insights and one tip.'],
          ['Ask anything', 'Pace, recovery, race prep or your plan.'],
        ],
      },
      {
        heading: 'It asks first.',
        intro: 'A screen names the AI provider (Anthropic) and lists what is sent: run stats, your goal, any health data you connected and anything you type. The server refuses to answer until you agree, and you can withdraw in Settings at any time.',
      },
      {
        heading: 'Guidance, not medical advice.',
        intro: 'PaceX does not diagnose. If you mention something like chest pain or fainting, it skips the AI and tells you to see a professional.',
      },
    ],
    faqs: [
      ['Is PaceX free?', 'Yes, at launch. Tracking, PaceX, training plans, clubs and the PACE Store are free when Runivo opens.'],
      ['What does PaceX see?', 'Only what you agree to. It never gets your GPS routes, name or email.'],
      ['Can I turn it off?', 'Yes. Withdraw your agreement in Settings and PaceX stops.'],
    ],
    guides: ['how-pacex-uses-your-data', 'easy-runs-slow-pace'],
    tools: ['training-paces'],
    related: ['training-plans', 'privacy-safety', 'run-tracking'],
    updated: UPDATED,
  },

  'training-plans': {
    slug: 'training-plans',
    title: 'Running training plans, 5K to marathon',
    description: 'Training plans for 5K, 10K, half marathon and marathon with built-in safety rules: slow weekly build-up, recovery weeks and a proper taper.',
    h1: 'A plan that fits your week.',
    lead: 'Pick a goal and the days you can run. Runivo builds the plan with the safety rules coaches use.',
    status: 'launch',
    facts: [['4', 'race goals, 5K to marathon'], ['10%', 'the most your weekly distance grows'], ['Every 4th', 'week is a lighter one']],
    sections: [
      {
        heading: 'Four distances.',
        items: [
          ['5K', '4 to 12 weeks.'],
          ['10K', '6 to 14 weeks.'],
          ['Half marathon', '8 to 18 weeks.'],
          ['Marathon', '12 to 24 weeks.'],
        ],
      },
      {
        heading: 'Safety is in the plan.',
        lines: [
          'Weekly distance grows by 10% at most.',
          'Every fourth week is a recovery week at 80% of the load.',
          'No more than a quarter of a week is hard running.',
          'A taper before race day: 1 week for 5K and 10K, 2 for a half, 3 for a marathon.',
        ],
      },
      {
        heading: 'It follows you.',
        items: [
          ['Runs match sessions', 'Record a run and Runivo ticks off the session it matches.'],
          ['A Monday check-in', 'If you missed sessions, PaceX offers to ease your plan. Nothing changes without your OK.'],
          ['Strength and mobility', 'Six guided sessions of 8 to 17 minutes.'],
        ],
      },
    ],
    faqs: [
      ['I am new to running. Is a plan right for me?', 'Yes. Choose "start running" and the plan begins gently, 20% lower and growing slower.'],
      ['Can I send a session to my watch?', 'Yes, on Apple Watch with iOS 17 and watchOS 10 or later. Sending a session to a Garmin watch is not available yet.'],
      ['Is a plan medical advice?', 'No. It is general guidance. If you have pain or a health condition, talk to a professional first.'],
    ],
    guides: ['build-a-10k-training-plan', 'recovery-weeks'],
    tools: ['race-time-predictor', 'training-paces'],
    related: ['ai-coach', 'run-tracking', 'clubs-events'],
    updated: UPDATED,
  },

  'pace-rewards': {
    slug: 'pace-rewards',
    title: 'PACE and the PACE Store',
    description: 'Earn PACE for every kilometre you run and spend it on partner rewards in the PACE Store. PACE is free to earn and cannot be bought.',
    h1: 'Run more. Earn PACE. Spend it.',
    lead: 'PACE is Runivo’s reward points. Earn it by running, spend it on partner rewards in selected cities.',
    status: 'launch',
    facts: [['2', 'PACE for every whole kilometre'], ['5', 'ranks, from Pacer to Sovereign'], ['Never', 'bought, sold or cashed out']],
    sections: [
      {
        heading: 'How you earn it.',
        items: [
          ['Kilometres', '2 PACE for each whole kilometre. A run of 4.9 km counts 4.'],
          ['New ground', '5 PACE for a new zone, and 10 for each rival zone you take.'],
          ['Streaks', '3 PACE each time your streak reaches a multiple of 7 days.'],
          ['Missions and friends', 'Daily missions pay 4 to 40 PACE. Inviting a friend pays 50 each.'],
        ],
        lines: ['A weekly cap keeps it fair. Rides and treadmill runs do not earn PACE.'],
      },
      {
        heading: 'Ranks.',
        intro: 'Pacer from the start, then Strider at 200, Chaser at 600, Hunter at 1,500 and Sovereign at 4,000 lifetime PACE. Spending PACE never lowers your rank.',
      },
      {
        heading: 'The PACE Store.',
        lines: [
          'Rewards from partner brands, limited to the cities each partner serves.',
          'Launch cities: Bengaluru, Mumbai, Delhi, Pune, Hyderabad, Chennai and Kolkata.',
          'Your account needs to be 14 days old with 3 verified runs, so rewards go to real runners.',
          'Partner rewards switch on city by city as partners join.',
        ],
        link: ['Run a brand? Become a PACE Store partner', '/partners'],
      },
    ],
    faqs: [
      ['Can I buy PACE?', 'No. PACE is free to earn, cannot be bought, sold or cashed out, and has no cash value.'],
      ['Which rewards are there?', 'Rewards come from partner brands and switch on city by city. We do not list any until a partner is live in your city.'],
      ['Can I cheat it?', 'Distance is worked out on our server from your raw GPS trace, and flagged runs are reviewed. No system is perfect, which is why runs can be appealed.'],
    ],
    guides: ['what-is-pace-and-the-pace-store', 'how-gps-run-tracking-works'],
    tools: [],
    related: ['zones', 'run-tracking', 'clubs-events'],
    updated: UPDATED,
  },

  zones: {
    slug: 'zones',
    title: 'Zones: turn your routes into ground',
    description: 'Every run on foot draws a zone along your route. Close a loop to claim what is inside, run through it again to keep it fresh. Optional, and private by choice.',
    h1: 'Your routes, turned into ground.',
    lead: 'Runivo draws a zone along every route you run. It is a game layer on top of tracking, and you can ignore it.',
    status: 'launch',
    facts: [['24 m', 'wide strip along your route'], ['10 a day', 'freshness lost without a visit'], ['30%', 'of a fresh zone to take it']],
    sections: [
      {
        heading: 'A route becomes a zone.',
        items: [
          ['A strip along your route', 'A run, trail run, walk, hike, wheelchair or stroller run claims a 24 m wide strip.'],
          ['A loop claims the inside', 'Finish within 100 m of an earlier point, with a loop of at least 300 m, and everything inside is yours too.'],
          ['A minimum to count', 'At least 200 m, 20 clean GPS points and 100 m² of area.'],
        ],
      },
      {
        heading: 'Zones fade. Running keeps them.',
        lines: [
          'A zone loses freshness at 10 a day. Below 40 it is stale.',
          'Running through your own zone sets it back to 100.',
          'To take a rival’s fresh zone you must overlap more than 30% of it. A stale one needs any overlap. Only the overlapping part changes hands.',
        ],
      },
      {
        heading: 'Play it, or do not.',
        intro: 'Tracking and PACE work the same without zones. You can hide your zones, hide yourself from leaderboards and mark private places. Rides and treadmill runs never claim zones.',
      },
    ],
    faqs: [
      ['Do I have to play the zone game?', 'No. Tracking, PaceX and plans work the same without it.'],
      ['Can other people see where I run?', 'Only what you allow. See privacy and safety.'],
      ['Do rides claim zones?', 'No. Rides are tracked but never claim zones.'],
    ],
    guides: ['how-gps-run-tracking-works', 'running-safely-routes-sharing-private-places'],
    tools: [],
    related: ['pace-rewards', 'privacy-safety', 'clubs-events'],
    updated: UPDATED,
  },

  'clubs-events': {
    slug: 'clubs-events',
    title: 'Running clubs, events and challenges',
    description: 'Join a running club with chat and weekly runs, find events near you, take on group challenges and climb weekly leaderboards. Opening with a pilot group first.',
    h1: 'Run with other people.',
    lead: 'Clubs, events, challenges and leaderboards for the days you want company. Opening with a pilot group first.',
    status: 'pilot',
    facts: [['3', 'leaderboards: territory, distance, PACE'], ['2 to 20', 'runners in a group challenge'], ['300 m', 'check-in distance at an event']],
    sections: [
      {
        heading: 'Clubs.',
        lines: [
          'Open clubs anyone can join, or invite-only clubs with join requests.',
          'A club chat, a club territory tab and a weekly match against a rival club.',
          'Club levels by total kilometres, from Local to Elite at 5,000 km.',
        ],
      },
      {
        heading: 'Events.',
        items: [
          ['Hosted events', 'RSVP, join a pace group and check in within 300 m of the start.'],
          ['Listed events', 'Races and runs with a link to register on the organiser’s page.'],
          ['Weekly club runs', 'Club owners can schedule a repeating run.'],
        ],
      },
      {
        heading: 'Challenges and leaderboards.',
        items: [
          ['Group challenges', '2 to 20 runners you follow, scored on distance, zones or days active.'],
          ['Leaderboards', 'By territory, distance or PACE, for the week, month or all time.'],
        ],
      },
    ],
    faqs: [
      ['Are clubs open to everyone?', 'Clubs and events start with a pilot group, then open up more widely. Join the waitlist and tell us your city.'],
      ['How do I report someone?', 'From the post, comment, chat message, club, event or profile. We aim to respond within 24 hours.'],
    ],
    guides: ['running-safely-routes-sharing-private-places'],
    tools: [],
    related: ['privacy-safety', 'zones', 'training-plans'],
    updated: UPDATED,
  },

  'privacy-safety': {
    slug: 'privacy-safety',
    title: 'Privacy and safety for runners',
    description: 'You choose who sees your profile, your routes and your start and end points. Private places, optional live sharing, no ads, and account deletion in the app.',
    h1: 'You decide who sees what.',
    lead: 'Running means sharing where you are. Runivo makes the safe choice easy.',
    status: 'launch',
    facts: [['13+', 'minimum age to use Runivo'], ['5', 'private places'], ['No', 'ads or ad trackers']],
    sections: [
      {
        heading: 'Who sees what.',
        items: [
          ['Your profile', 'Public, followers you approve, or only you.'],
          ['Each activity', 'Everyone, followers or only you, run by run.'],
          ['Your map', 'Hide the first and last 200, 400, 800 or 1,600 m of every run, or hide maps entirely.'],
          ['Private places', 'Mark up to 5 places such as home. Others never see zones near them or the part of a route inside them.'],
        ],
      },
      {
        heading: 'Being safe out there.',
        lines: [
          'Live sharing with mutual friends is off until you turn it on.',
          'Send a safety link to someone you trust. It updates every 15 seconds and stops working after 12 hours.',
          'Runivo asks for your location only while you use the app on iPhone.',
        ],
      },
      {
        heading: 'Your data.',
        lines: [
          'PaceX stays off until you read what it sends and say yes.',
          'No ads and no ad trackers.',
          'Delete your account and your data in the app, any time.',
          'Under 13s cannot use Runivo. 13 to 17 start with a private profile and live sharing off.',
        ],
      },
    ],
    faqs: [
      ['Can strangers see where I live?', 'Not if you do not want them to. Hide the start and end of your runs, mark home as a private place, or set your profile to private.'],
      ['Does Runivo sell my data?', 'No. There are no ads and no ad trackers in the app.'],
      ['How do I delete my account?', 'In the app. Your account and data are removed.'],
    ],
    guides: ['running-safely-routes-sharing-private-places', 'how-pacex-uses-your-data'],
    tools: [],
    related: ['zones', 'clubs-events', 'ai-coach'],
    updated: UPDATED,
  },
};

export const FEATURE_LIST: Feature[] = Object.values(FEATURES);
