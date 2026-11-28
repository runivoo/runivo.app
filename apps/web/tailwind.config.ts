import type { Config } from 'tailwindcss';

/**
 * Tailwind is used only by the admin (app/admin). Everything else on the site uses the
 * tokens in app/globals.css. So the admin does not look like a different product, the
 * palette, radii and weights below are the website's (and the mobile app's) tokens:
 * warm paper and ink instead of Tailwind's cool grays, Outfit semibold instead of bold,
 * 22px cards. Text shades are AA-readable (4.5:1 on white and on the paper background).
 */
const config: Config = {
  content: [
    './app/admin/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals: --bg, --border, --t3, --t2, --ink from globals.css.
        gray: {
          50: '#F4F5F1', 100: '#E2E4DE', 200: '#D3D6CE', 300: '#757972', 400: '#666A64',
          500: '#5F635D', 600: '#4A4D49', 700: '#3A3D39', 800: '#26282A', 900: '#17181A',
        },
        // Danger: --danger.
        red: {
          50: '#FBEEEC', 100: '#F5D8D4', 200: '#EDB9B3', 300: '#E08A80', 400: '#C9372C',
          500: '#C9372C', 600: '#A92B21', 700: '#8B2119',
        },
        // Warning: the app's amber.
        amber: { 50: '#FDF0DF', 100: '#F8E0BD', 500: '#C2700A', 600: '#97530A', 700: '#7C4306' },
        orange: { 50: '#FDF0DF', 100: '#F8E0BD', 500: '#C2700A', 600: '#97530A', 700: '#7C4306' },
        // Success: --accent.
        green: { 50: '#EEF5E4', 100: '#DCEBC8', 500: '#4E7F1F', 600: '#456F1B', 700: '#3A5E17' },
        // Info: the app's lavender and its ink.
        blue: { 50: '#EEECFB', 100: '#E4E1F8', 500: '#4D4590', 600: '#3C3577', 700: '#3C3577' },
      },
      borderRadius: {
        '2xl': '22px', // --radius: cards
      },
      fontWeight: {
        bold: '600', // the site's headings are Outfit semibold
      },
    },
  },
  plugins: [],
};

export default config;
