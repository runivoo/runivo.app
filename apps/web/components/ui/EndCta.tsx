import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { GetAppLink } from '@/components/ui/GetAppLink';
import { APP_LIVE } from '@/lib/config/site';

/** The closing call to action on content pages: the waitlist form before launch, the download button after. */
export function EndCta({ heading = 'Ready to run smarter?', lead = 'Runivo is opening city by city. Join the waitlist and we’ll tell you the day it reaches yours.', large }: { heading?: React.ReactNode; lead?: string; large?: boolean }) {
  return (
    <section className="section cta-end" id="waitlist">
      <div className="container">
        <h2 className={large ? 'h-display' : 'h-section'} style={large ? { fontSize: 'clamp(38px, 6vw, 72px)' } : undefined}>{heading}</h2>
        {APP_LIVE ? (
          <div className="actions" style={{ justifyContent: 'center' }}>
            <GetAppLink className="btn btn-dark" live="Download for iPhone" />
          </div>
        ) : (
          <>
            <p className="lead" style={{ margin: '16px auto 0', maxWidth: 460 }}>{lead}</p>
            <WaitlistForm source="web" />
          </>
        )}
      </div>
    </section>
  );
}
