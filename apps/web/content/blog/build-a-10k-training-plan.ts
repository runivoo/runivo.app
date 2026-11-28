import type { PostSource } from '@/lib/blog';

const post: PostSource = {
  slug: 'build-a-10k-training-plan',
  title: 'How to build a 10K plan that avoids injury',
  description: 'The few rules that make a 10K training plan work: a weekly rhythm, slow build-up, lighter weeks, one hard session and a short taper. With an example week.',
  category: 'Training',
  published: '2026-11-28',
  updated: '2026-11-28',
  feature: 'training-plans',
  tools: ['race-time-predictor', 'training-paces'],
  next: ['recovery-weeks', 'tempo-runs-and-intervals-explained', 'pace-a-half-marathon'],
  body: `
A good 10K plan is less about clever sessions and more about not getting hurt. Most training plans that fail do so because the load grew too fast. Here is what a sensible plan looks like, and how to build or judge one yourself.

## Start from what you can do now

A plan should begin close to what you already run. If you run 15 km a week comfortably, start near 15 km, not at 30. Plans that assume a fitness you do not have are the main way people end up injured in week three.

## The weekly rhythm

Most 10K plans for 3 to 5 run days a week use the same pieces:

- **Easy runs** make up most of your weekly distance. See [why most runs should feel slow](/blog/easy-runs-slow-pace).
- **One long run**, a little longer each couple of weeks, at an easy pace.
- **One quality session**: a tempo run or intervals. Read [tempo runs and intervals, explained](/blog/tempo-runs-and-intervals-explained).
- **Rest or cross-training** on the other days.

## An example week at 4 days

1. **Monday:** rest.
2. **Tuesday:** easy 5 km.
3. **Thursday:** tempo, with 10 minutes easy, 20 at tempo, 10 easy.
4. **Saturday:** easy 5 km, or a strength session.
5. **Sunday:** long run, 8 to 10 km, easy.

Adjust the days to your life, but keep a rest day or easy day after hard ones.

## Build slowly

A common guideline is not to raise your weekly distance by more than about 10% from one week to the next. It is not a perfect rule, but it keeps you away from sudden jumps. Runivo’s plans use that limit.

## Lighten every few weeks

Fitness comes during recovery, not only during the work. Every third or fourth week, cut your volume by 20 to 30%. Runivo plans make every fourth week a recovery week at 80% of the load. We explain why in [why every fourth week should be lighter](/blog/recovery-weeks).

## How long?

A 10K plan usually runs 6 to 14 weeks depending on where you start. Beginners need more time. If you can already run 5K comfortably, 8 weeks is a sensible length.

## Taper before race day

In the last week before the race, cut your distance by around a third to a half while keeping a little pace in your legs. You should arrive at the start feeling fresh and slightly restless, not tired.

## Race-day pace

If you have a recent 5K time, the [race time predictor](/tools/race-time-predictor) gives a realistic 10K target. Start the first kilometre a little slower than that, then settle in.

## Let a plan do the sums

If you would rather not build this yourself, [Runivo’s training plans](/features/training-plans) apply these rules automatically, match your runs to sessions and offer to ease your week if you miss some. If you have pain, a health condition or a long break from exercise, check with a professional first.
`,
};
export default post;
