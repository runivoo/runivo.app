# Website claims: what the public site may say

The marketing pages (`apps/web`: features, tools, guides, glossary, cities) describe the app. Everything on them has to be true of the app **today**, not planned. `apps/web/lib/content.test.ts` scans the copy for the claims below and compares the numbers with `packages/shared/src/engine/runEngine.ts`.

## Where each number comes from

| On the site | Source |
|---|---|
| 2 PACE per whole km, 5 per new zone, 10 per rival zone, 3 per 7-day streak | `ENGINE.PACE_PER_KM`, `PACE_PER_NEW_ZONE`, `PACE_PER_STOLEN_ZONE`, `PACE_STREAK_BONUS`, `STREAK_BONUS_EVERY_DAYS` |
| Ranks 0 / 200 / 600 / 1,500 / 4,000 | `ENGINE.RANK_THRESHOLDS` |
| 24 m strip, 100 m loop close, 300 m loop, 200 m / 20 points / 100 m² minimum | `CORRIDOR_HALF_WIDTH_M` ×2, `LOOP_CLOSE_DIST_M`, `LOOP_MIN_PERIMETER_M`, `MIN_TERRITORY_*`, `MIN_GPS_POINTS` |
| Freshness 10 a day, stale below 40 | `FRESHNESS_DECAY_PER_DAY`, `FRESHNESS_STALE_AT` |
| GPS: accuracy 50 m, 7.5 m/s | `GPS_ACCURACY_THRESHOLD_M`, `MAX_SEGMENT_SPEED_MS` |
| Sports that claim zones and earn PACE | `ENGINE.TERRITORY_ACTIVITIES` |
| Plan lengths, 10% growth, every 4th week at 80%, tapers | `packages/shared/src/engine/training.ts` |
| Store cities, 14 days and 3 runs to redeem | `store_cities` seed and `reward_block_reason()` in `supabase/migrations` |
| PaceX consent, what is sent | `apps/mobile/src/features/coach/components/AiConsentCard.tsx`, `supabase/functions/ai-coach` |

## Do not say (until it is true)

- That the app is **available**, "download now", or has any user count, review or testimonial.
- **Free forever**, or anything about a subscription or Plus. All three subscription switches are off; copy says "free at launch".
- **Weekly PACE cap numbers.** They differ between free and Plus and today everyone gets the higher one. Say "a weekly cap".
- **Garmin, COROS, Polar** sync, an Apple Watch or Wear OS **app**, **Android**, **Health Connect**. Say "not available yet" if asked.
- **Nutrition** or calorie tracking (parked).
- **Partner brand names** or live rewards. No partner is live. Say rewards "switch on city by city as partners join".
- **"Cheat-proof"**, or that you are alerted the moment a rival takes a zone (about half of those pushes are held back in a pilot).
- That PACE is money, a token or crypto. It is free-to-earn reward points.
- That rides or treadmill runs earn PACE or claim zones. They do not.
- Old wording: "run through a hexagon to claim it". Zones are strips drawn along your route.

## Before launch

- Set `APP_LIVE` and `APP_STORE_URL` in `apps/web/lib/config/site.ts`. The structured data for the app (`mobileAppLd`) is emitted only then.
- Revisit every "free at launch", "pilot" and "not available yet" line against the live app, and bump the `updated` date on any page you change.
