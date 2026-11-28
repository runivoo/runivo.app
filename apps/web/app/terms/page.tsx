import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { staticPage } from '@/lib/pages';
import { LegalPage } from '@/components/templates/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = pageMetadata(staticPage('/terms'));

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2026">

    <h2>Agreement to Terms</h2>
    <p>
      By downloading or using Runivo, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.
    </p>

    <h2>1. Eligibility</h2>
    <p>
      You must be at least 13 years old to use Runivo. By using the service you represent that you meet this requirement. If you are under 18, you must have parental consent.
    </p>

    <h2>2. Account</h2>

    <h3>Registration</h3>
    <p>
      You must create an account to use Runivo. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.
    </p>

    <h3>Usernames</h3>
    <p>
      Usernames must not impersonate others, contain offensive language, or infringe trademarks. We reserve the right to reclaim usernames that violate these rules.
    </p>

    <h2>3. Acceptable Use</h2>
    <p>
      You agree not to: use Runivo to harass, threaten, or harm other users; manipulate GPS data or exploit bugs to gain unfair territory advantages; use automated scripts or bots; resell or commercially exploit Runivo content; or attempt to access other users&apos; accounts.
    </p>

    <h2>4. PACE Tokens</h2>
    <p>
      PACE tokens are a virtual in-app currency with no monetary value. They cannot be exchanged for real money, transferred between accounts, or redeemed outside of Runivo&apos;s partner reward programme. We reserve the right to modify PACE earn rates and redemption rules at any time with reasonable notice.
    </p>

    <h2>5. Territory</h2>
    <p>
      Territory claims are a game mechanic. They confer no real-world rights over any location. Territory can be lost through natural decay or by other runners claiming zones. We make no guarantees about the persistence of any territory claim.
    </p>

    <h2>6. Content and Conduct</h2>
    <p>
      You retain ownership of content you create (photos, descriptions, comments, messages). By submitting content you grant Runivo a non-exclusive, royalty-free licence to use, display, and distribute it within the app.
    </p>
    <p>
      There is no tolerance for objectionable content or abusive users. You must not post content that is illegal, hateful, harassing, sexually explicit, threatening, or that infringes third-party rights, and you must not impersonate others or cheat (for example by faking GPS data or using a vehicle on a foot run).
    </p>
    <p>
      Anyone can report a comment, post, club, event, message or runner from inside the app, and can block any runner. We review reports and act on content that breaks these rules, usually within 24 hours: we may remove it, hide it, or suspend or end the account that posted it. To report something we have missed, email{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
    </p>

    <h2>7. Paid Features</h2>
    <p>
      Runivo is free and has no subscriptions or in-app purchases at this time. If paid features are offered later, their price, billing and cancellation terms will be shown in the app before you buy, and these Terms will be updated first.
    </p>

    <h2>8. Disclaimers</h2>
    <p>
      Runivo is provided &ldquo;as is&rdquo; without warranties of any kind. GPS accuracy varies by device and environment. Runivo is a game — always follow traffic laws, stay on public paths and never enter private property, and exercise safely. PaceX gives general running guidance, not medical advice; talk to a doctor before changing your training if you have a health concern. We are not responsible for any injury, accident, or loss arising from your use of the app.
    </p>

    <h2>9. Limitation of Liability</h2>
    <p>
      To the maximum extent permitted by law, Runivo&apos;s total liability for any claim arising from these Terms shall not exceed the amount you paid to Runivo in the 12 months preceding the claim, or £10, whichever is greater.
    </p>

    <h2>10. Termination</h2>
    <p>
      We may suspend or terminate your account if you violate these Terms. You may delete your account at any time in Settings. Upon termination, your data will be deleted in accordance with our Privacy Policy.
    </p>

    <h2>11. Governing Law</h2>
    <p>
      These Terms are governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales.
    </p>

    <h2>12. Changes</h2>
    <p>
      We may update these Terms from time to time. We will notify you of material changes 30 days in advance. Continued use after the effective date constitutes acceptance.
    </p>

    <h2>13. Contact</h2>
    <p>
      Questions about these Terms? Email{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
    </p>
    </LegalPage>
  );
}
