import type { PostSource } from '@/lib/blog';

const post: PostSource = {
  slug: 'how-pacex-uses-your-data',
  title: 'How PaceX uses your data',
  description: 'What the PaceX AI coach looks at, what it sends to its AI provider, what it never gets, and how to turn it off. Plain answers about your data.',
  category: 'Using Runivo',
  published: '2026-11-28',
  updated: '2026-11-28',
  feature: 'ai-coach',
  tools: [],
  next: ['running-safely-routes-sharing-private-places', 'easy-runs-slow-pace', 'what-is-pace-and-the-pace-store'],
  body: `
An AI coach can only help if it knows how you run. That means sending some of your data to an AI provider. This page says plainly what PaceX looks at, what leaves your account and what does not.

## It is off until you say yes

PaceX does nothing until you open it for the first time and agree on a screen that names the provider and lists what is sent. Without your agreement, our server refuses to answer. You can withdraw your agreement in Settings at any time, and PaceX stops.

## What it is sent

When you ask PaceX something, or when it writes a debrief after a run, it is sent:

- Stats from your recent runs, covering up to the last 90 days: distance, pace, how hard the effort was, your personal records and how your plan is going.
- Heart-rate data, if your runs have it.
- Your goal, your experience level, and your age range and weight if you chose to give them.
- Imported Apple Health workouts, only if you switched that on.
- Anything you type to it.
- A photo of your foot, only if you use the optional foot scan.

## What it is never sent

- Your **GPS routes**.
- Your **name**.
- Your **email address**.

## Who receives it

The text goes to Anthropic, the company that makes the AI model PaceX uses, so it can write a reply. Runivo shows no ads and has no ad trackers.

## How it stays safe

- PaceX gives general running guidance and not medical advice. It does not diagnose.
- If you mention things like chest pain or fainting, a fixed message tells you to see a professional, and no AI is involved.
- There is a daily limit per runner so the service stays available for everyone.

## How to turn it off

Open Settings and withdraw your agreement for PaceX. You can also delete your account in the app at any time, which removes your data from Runivo.

## What you give up

Without PaceX you still get GPS tracking, plans, PACE and zones. You lose the debrief after each run, the weekly review and the chat. Your training plan still works.

For the full detail, read our [privacy policy](/privacy), and see the [PaceX feature page](/features/ai-coach) and [privacy and safety](/features/privacy-safety).
`,
};
export default post;
