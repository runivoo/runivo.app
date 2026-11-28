import { withReadTime, type Post, type PostSource } from '@/lib/blog';

import startRunning from './start-running-0-to-5k';
import indianHeat from './running-in-indian-heat-humidity-monsoon';
import easyRuns from './easy-runs-slow-pace';
import tempo from './tempo-runs-and-intervals-explained';
import tenK from './build-a-10k-training-plan';
import halfMarathon from './pace-a-half-marathon';
import recovery from './recovery-weeks';
import shoes from './when-to-replace-running-shoes';
import safety from './running-safely-routes-sharing-private-places';
import gps from './how-gps-run-tracking-works';
import pacex from './how-pacex-uses-your-data';
import pace from './what-is-pace-and-the-pace-store';

const SOURCES: PostSource[] = [
  startRunning, indianHeat, easyRuns, tempo, tenK, halfMarathon, recovery, shoes, safety, gps, pacex, pace,
];

/** Newest first. */
export const POSTS: Post[] = SOURCES.map(withReadTime).sort((a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
