import type { PostSource } from '@/lib/content/blog';

const post: PostSource = {
  slug: 'how-gps-run-tracking-works',
  title: 'How GPS tracking works, and why distances differ',
  description: 'Why two apps record different distances for the same run: how GPS gets your position, what tall buildings and trees do to it, and how Runivo checks each run.',
  category: 'Using Runivo',
  published: '2026-11-28',
  updated: '2026-11-28',
  feature: 'run-tracking',
  tools: ['pace-calculator'],
  next: ['what-is-pace-and-the-pace-store', 'when-to-replace-running-shoes', 'how-pacex-uses-your-data'],
  body: `
You run a 5K route, and one app says 5.02 km while another says 4.91. Neither is wrong, exactly. GPS is good, not perfect, and small differences add up over a run.

## How your phone knows where you are

Satellites broadcast timing signals. Your phone listens for signals from several, measures how long each took to arrive and works out its position. It does this once a second or so, and your run is a trail of those points. The distance is the sum of the gaps between points.

## Why it is never exact

- **Signal quality.** Tall buildings reflect signals, and trees and tunnels block them. In a dense street your position can wobble by several metres, or jump.
- **Noise adds distance.** Each tiny wobble adds a little extra length to your route, so a noisy track reads long.
- **Smoothing.** Apps smooth the trace in different ways. More smoothing cuts corners and shortens the distance, less smoothing keeps the wobble.
- **How often it samples.** Every second gives more detail than every few seconds.
- **The route you take.** Race courses are measured along the shortest legal path. If you drift wide at corners, you run extra, and your watch is correct to say so.
- **Your phone.** Different phones have different receivers, and a phone in a pocket or bag does worse than one on an armband.

A difference of 1% or so between two devices is normal.

## How to get a cleaner track

1. Wait for the GPS signal to settle before you start. Standing still for a few seconds helps.
2. Carry the phone in the same place each time.
3. Keep location accuracy on and allow Runivo to use your precise location.
4. Do not worry about small differences between runs.

## What Runivo does on the server

For PACE and zones, Runivo does not trust the number your phone reports. The server works the distance out again from the raw GPS trace. It drops readings with an accuracy worse than 50 m, and readings that imply a speed of more than 7.5 m/s, which is faster than anyone can run. It also limits distance to what the time allows, and runs with fake or generated location data earn nothing.

That means your leaderboard distance and your PACE come from the same, checked number. Read how [PACE works](/blog/what-is-pace-and-the-pace-store).

## Pace from distance

Pace is just time divided by distance, so a tiny change in distance moves your pace a little. The [pace calculator](/tools/pace-calculator) shows the sums.

## Indoors

GPS does not work on a treadmill. In Runivo you log a treadmill run by hand. It counts towards your distance and goals, and does not earn PACE or claim zones. See [run tracking](/features/run-tracking) for the full list of sports.
`,
};
export default post;
