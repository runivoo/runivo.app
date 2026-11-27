'use client';
import { AlertCircle, X } from 'lucide-react';
import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/*
 * Admin building blocks. They follow the website's design system (app/globals.css, and the
 * palette in tailwind.config.ts): sentence-case labels, pill buttons, 22px cards, 12px fields
 * with a green focus ring, 44px touch targets on phones, readable text colours.
 */

export const inputClass = `w-full px-4 py-3 rounded-xl bg-white border border-gray-100 min-h-[48px]
  text-gray-900 text-[15px] font-medium placeholder:text-gray-300 placeholder:font-normal
  focus:outline-none focus:border-[#4E7F1F] focus:ring-4 focus:ring-[#4E7F1F]/15 transition-[border-color,box-shadow]`;

export const labelClass = 'text-sm font-medium text-gray-500 mb-2 block';

export const primaryBtn = `inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-full bg-gray-900 text-white
  text-sm font-semibold hover:opacity-90 active:scale-[.98] transition disabled:opacity-40 disabled:pointer-events-none`;
export const ghostBtn = `inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] sm:min-h-[40px] rounded-full border border-gray-100 bg-white
  text-sm font-semibold text-gray-700 hover:border-gray-200 active:scale-[.98] transition disabled:opacity-40 disabled:pointer-events-none`;
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

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

export function FormCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="mb-6 p-6 rounded-2xl border border-[#4E7F1F]/20 bg-green-50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
        <button onClick={onClose} className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center hover:bg-white transition-colors" aria-label="Close">
          <X className="w-4 h-4 text-gray-500" aria-hidden />
        </button>
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
