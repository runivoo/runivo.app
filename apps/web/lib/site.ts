/**
 * Site-wide constants.
 *
 * APP_LIVE decides what every "get the app" button on the site does:
 *   false (pre-launch): the buttons say "Join the waitlist" and go to the waitlist form.
 *   true  (launched):   the buttons say "Download" and go to APP_STORE_URL.
 *
 * At launch: set APP_STORE_URL to https://apps.apple.com/app/id<ascAppId> and APP_LIVE to true.
 */
export const APP_LIVE = false;
export const APP_STORE_URL = 'https://apps.apple.com';
export const WAITLIST_HREF = '/#waitlist';
export const SUPPORT_EMAIL = 'support@runivo.com';
export const SITE_NAME = 'Runivo';
