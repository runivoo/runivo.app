'use client';
import { PencilSimple, ToggleLeft, ToggleRight, Trash, WarningCircle, X } from '@phosphor-icons/react/ssr';
import { Children, cloneElement, isValidElement, useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';

/*
 * Admin building blocks. They follow the website's design system (styles/globals.css, and the
 * palette in tailwind.config.ts): sentence-case labels, pill buttons, 22px cards, 12px fields
 * with a green focus ring, 44px touch targets on phones, readable text colours.
 */

export const inputClass = `w-full px-4 py-3 rounded-xl bg-white border border-gray-100 min-h-[48px]
  text-gray-900 text-[15px] font-medium placeholder:text-gray-300 placeholder:font-normal
  focus:outline-none focus:border-[#4E7F1F] focus:ring-4 focus:ring-[#4E7F1F]/15 transition-[border-color,box-shadow]`;

export const labelClass = 'text-sm font-medium text-gray-500 mb-2 block';

/* ── Buttons: one design for every action in the admin ───────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warn';

const BUTTON_BASE = `inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap
  transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none`;
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-gray-900 text-white hover:opacity-90',
  secondary: 'bg-white border border-gray-100 text-gray-700 hover:border-gray-200',
  danger:    'bg-red-50 border border-red-100 text-red-600 hover:bg-red-100',
  warn:      'bg-amber-500 text-white hover:opacity-90',
};
// Both sizes are at least 44px tall on touch screens.
const BUTTON_SIZE = { md: 'px-6 min-h-[44px] text-sm', sm: 'px-4 min-h-[44px] sm:min-h-[40px] text-sm' };

/** Text button. `grow` stretches it to share a row equally (Cancel / Save). */
export function Button({
  variant = 'primary', size = 'md', grow = false, icon, className = '', type = 'button', children, ...rest
}: ComponentPropsWithRef<'button'> & { variant?: ButtonVariant; size?: 'md' | 'sm'; grow?: boolean; icon?: ReactNode }) {
  return (
    <button type={type} className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${grow ? 'flex-1' : ''} ${className}`} {...rest}>
      {icon}{children}
    </button>
  );
}

/** Round icon-only button (edit, delete, move). `label` is required: it is the accessible name and the tooltip. */
export function IconButton({
  label, variant = 'secondary', className = '', type = 'button', children, ...rest
}: Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'title'> & { label: string; variant?: 'secondary' | 'danger' }) {
  return (
    <button
      type={type} aria-label={label} title={label}
      className={`${BUTTON_BASE} w-11 h-11 flex-shrink-0 ${BUTTON_VARIANT[variant]} ${className}`} {...rest}
    >
      {children}
    </button>
  );
}

/** The pencil button at the end of a table row. `name` is what is being edited ("Edit <name>"). */
export function EditButton({ name, onClick }: { name: string; onClick: () => void }) {
  return <IconButton label={`Edit ${name}`} onClick={onClick}><PencilSimple className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>;
}

/** The red bin button at the end of a table row. */
export function RemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  return <IconButton variant="danger" label={`Remove ${name}`} onClick={onClick}><Trash className="w-4 h-4" aria-hidden /></IconButton>;
}

export const thClass = 'text-left text-xs font-medium text-gray-500 px-4 py-3';

/**
 * A labelled form control. A single <input>, <select> or <textarea> child is linked to its
 * label (htmlFor/id), so clicking the label focuses it and screen readers announce it.
 * Anything else (a pair of checkboxes, say) becomes a labelled group instead.
 */
export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  const uid = useId();
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  const isControl = isValidElement(only) && typeof only.type === 'string' && ['input', 'select', 'textarea'].includes(only.type);

  const text = (
    <>
      {label} {hint && <span className="font-normal text-gray-300">{hint}</span>}
    </>
  );

  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      {isControl ? (
        <>
          <label htmlFor={uid} className={labelClass}>{text}</label>
          {cloneElement(only as ReactElement<{ id?: string }>, { id: (only as ReactElement<{ id?: string }>).props.id ?? uid })}
        </>
      ) : (
        <div role="group" aria-labelledby={uid}>
          <span id={uid} className={labelClass}>{text}</span>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Layout: every section starts and lays out the same way ──────────────────── */

/** Section title, a one-line description and the section's actions. Actions wrap under the title on phones. */
export function SectionHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6">
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}

/** Rounded white card that holds a table and scrolls sideways on narrow screens instead of breaking the page. */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Nothing to show yet: an optional icon, a line, and an optional hint. */
export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="mx-auto mb-3 w-fit text-gray-200" aria-hidden>{icon}</div>}
      <p className="text-sm text-gray-500">{title}</p>
      {hint && <p className="text-sm text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

/** Live / off switch for a row. A real button with its state exposed (aria-pressed). */
export function StatusToggle({ active, name, onToggle }: { active: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      type="button" onClick={onToggle} aria-pressed={active} aria-label={`${name}: ${active ? 'live' : 'off'}`}
      className="inline-flex items-center gap-1.5 px-2 min-h-[44px] rounded-full hover:bg-gray-50 transition-colors"
    >
      {active ? <ToggleRight className="w-5 h-5 text-[#4E7F1F]" aria-hidden /> : <ToggleLeft className="w-5 h-5 text-gray-300" aria-hidden />}
      <span className={`text-xs font-semibold ${active ? 'text-[#4E7F1F]' : 'text-gray-500'}`}>{active ? 'Live' : 'Off'}</span>
    </button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
      <WarningCircle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

export function FormCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="mb-6 p-6 rounded-2xl border border-[#4E7F1F]/20 bg-green-50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
        <IconButton label="Close" onClick={onClose}><X className="w-4 h-4 text-gray-500" aria-hidden /></IconButton>
      </div>
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(78,127,31,0.15)', borderTopColor: '#4E7F1F' }} />
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'blue' | 'orange' | 'gray' | 'red' | 'gold'; children: ReactNode }) {
  const cls = {
    green:  'text-green-700 bg-green-50 border-green-100',
    blue:   'text-blue-700 bg-blue-50 border-blue-100',
    orange: 'text-orange-700 bg-orange-50 border-orange-100',
    gray:   'text-gray-500 bg-gray-50 border-gray-100',
    red:    'text-red-600 bg-red-50 border-red-100',
    gold:   'text-amber-700 bg-amber-50 border-amber-100',
  }[tone];
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap capitalize ${cls}`}>{children}</span>;
}

/** <input type="datetime-local"> value for an ISO timestamp, in the admin's local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string from a datetime-local value (interpreted in the admin's time zone). */
export function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}
