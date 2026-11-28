import type { PostSource } from '@/lib/content/blog';

const post: PostSource = {
  slug: 'easy-runs-slow-pace',
  title: 'Easy runs: why most runs should feel slow',
  description: 'Why coaches have runners spend most of their time at a comfortable pace, how to find yours with the talk test, and what slow running does for your body.',
  category: 'Training',
  published: '2026-11-28',
  updated: '2026-11-28',
  feature: 'ai-coach',
  tools: ['training-paces'],
  next: ['tempo-runs-and-intervals-explained', 'recovery-weeks', 'build-a-10k-training-plan'],
  body: `
If every run feels hard, you are probably running too fast most of the time. Almost every training approach for distance running has the same shape: a lot of easy running, and a smaller amount of hard running. Easy runs are not a warm-up for the real training. They are most of it.

## What an easy run is

An easy run is a pace you could hold and still talk in full sentences. You finish feeling like you could have gone further. For many runners that is much slower than they expect, and slower than they think looks respectable. That is fine.

## Why slow is useful

- **It builds your aerobic base.** Running at a comfortable effort for a long time trains your heart, lungs and the small blood vessels in your muscles, which is what lets you run longer and faster later.
- **It protects you.** Easy running puts less stress on muscles and joints, so you can run more often without getting injured.
- **It lets the hard days be hard.** If you do not recover from your easy runs, your hard sessions get worse and your risk of injury goes up.

A common rule of thumb is that around 80% of your running should be easy and around 20% hard. It is a guide, not a law, but it matches how most good runners train.

## How to find your easy pace

1. **Talk test.** You can speak a full sentence without gasping.
2. **Breathing.** You can breathe through your nose for part of the run, if you like.
3. **A pace from a race.** If you know a recent 5K or 10K time, our [training pace tool](/tools/training-paces) turns it into an easy pace range.
4. **Effort scale.** Around 3 or 4 out of 10.

On hot days or hills, your pace will slip. Let it. Run by effort.

## Common worries

**"I am not getting faster if I run slow."** You are. The base built on easy runs is what makes your tempo runs and intervals work. Our guide to [tempo runs and intervals](/blog/tempo-runs-and-intervals-explained) covers the hard part.

**"It feels too easy."** That is the point. If you are unsure, go slower, not faster.

**"It is boring."** Run with a friend, pick a new route, or listen to a podcast. Easy runs are the best time to enjoy running.

## How PaceX uses this

Runivo’s [PaceX coach](/features/ai-coach) looks at how much of your recent running was easy and how much was hard, and tells you if the balance is off. If most of your runs sit at the same moderate effort, it will say so, and suggest slowing your easy days.
`,
};
export default post;
