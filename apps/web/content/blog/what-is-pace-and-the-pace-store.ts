import type { PostSource } from '@/lib/blog';

const post: PostSource = {
  slug: 'what-is-pace-and-the-pace-store',
  title: 'What PACE is and how the PACE Store works',
  description: 'PACE is Runivo’s reward points: how you earn them from kilometres, missions and streaks, how ranks work, and how you spend PACE on partner rewards in the Store.',
  category: 'Using Runivo',
  published: '2026-11-28',
  updated: '2026-11-28',
  feature: 'pace-rewards',
  tools: [],
  next: ['how-gps-run-tracking-works', 'how-pacex-uses-your-data', 'start-running-0-to-5k'],
  body: `
PACE is the reward points in Runivo. You earn it by running, and you can spend it in the PACE Store on rewards from partner brands. Here is how it works, without the hype.

## What PACE is, and is not

PACE is free to earn. It cannot be bought, sold or cashed out, and it has no cash value. It is not a cryptocurrency. It exists so that running more has a small, tangible reward.

## How you earn it

- **2 PACE for each whole kilometre.** A 4.9 km run counts 4 km.
- **5 PACE for a new zone**, and **10 PACE for each rival zone you take.** Zones are explained on the [zones page](/features/zones).
- **3 PACE each time your streak reaches a multiple of 7 days.**
- **Daily missions**: three a day, worth 4 to 40 PACE each.
- **Invites:** 50 PACE each for you and a friend you invite, once they finish their first verified run of at least 1 km.

Rides and treadmill runs do not earn PACE. A weekly cap applies, and it resets on Monday.

## Ranks

Your rank follows your lifetime PACE, and spending PACE never lowers it:

1. **Pacer:** where everyone starts.
2. **Strider:** 200 lifetime PACE.
3. **Chaser:** 600.
4. **Hunter:** 1,500.
5. **Sovereign:** 4,000.

## The PACE Store

The Store is where you spend PACE. Rewards come from partner brands and are limited to the cities each partner serves. The launch cities are Bengaluru, Mumbai, Delhi, Pune, Hyderabad, Chennai and Kolkata. Partner rewards switch on city by city as partners join, so the Store will start small.

Each reward has its own rules: how much PACE it costs, how many are available, how long it runs and sometimes a minimum rank. You can redeem each reward once.

## Making sure it is fair

Rewards cost partners real money, so we make sure they go to real runners. To redeem, your account has to be 14 days old with 3 verified runs. Distance for PACE is worked out on the server from your GPS trace, as explained in [how GPS tracking works](/blog/how-gps-run-tracking-works). Flagged runs can be appealed.

## For brands

If you run a shop, a gym, a café or a brand and want to reach runners at the moment they have earned something, read about [becoming a PACE Store partner](/partners).
`,
};
export default post;
