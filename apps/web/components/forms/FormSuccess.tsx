import { Check } from '@phosphor-icons/react/ssr';

/** The green "done" note after a form is sent: a tick, a title and a line. */
export function FormSuccess({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="waitlist-done" role="status" style={wide ? { maxWidth: 'none' } : undefined}>
      <span className="waitlist-tick"><Check size={18} weight="bold" aria-hidden /></span>
      <div>
        <p className="waitlist-done-title">{title}</p>
        <p className="waitlist-done-body">{children}</p>
      </div>
    </div>
  );
}
