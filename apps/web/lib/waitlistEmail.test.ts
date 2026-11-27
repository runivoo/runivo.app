import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWaitlistEmail, sendWaitlistWelcome } from './waitlistEmail';

const ENV = { ...process.env };

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.WAITLIST_FROM = 'Runivo <hello@runivo.in>';
  delete process.env.WAITLIST_REPLY_TO;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
});

const ok = () => vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 })) as unknown as typeof fetch;

describe('renderWaitlistEmail', () => {
  it('names the city when there is one', () => {
    const m = renderWaitlistEmail('Pune');
    expect(m.text).toContain('in Pune');
    expect(m.html).toContain('in Pune');
  });

  it('falls back to "your city" without one', () => {
    expect(renderWaitlistEmail(null).text).toContain('in your city');
  });

  it('escapes the city, which the visitor typed', () => {
    const m = renderWaitlistEmail('<script>alert(1)</script>"&');
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).toContain('&quot;&amp;');
  });
});

describe('sendWaitlistWelcome', () => {
  it('does nothing when Resend is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    const f = ok();
    expect(await sendWaitlistWelcome('a@b.co', null, f)).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('does nothing without a from address', async () => {
    delete process.env.WAITLIST_FROM;
    const f = ok();
    expect(await sendWaitlistWelcome('a@b.co', null, f)).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('posts the email to Resend with the key, recipient and an idempotency key', async () => {
    const f = ok();
    expect(await sendWaitlistWelcome('runner@example.com', 'Pune', f)).toBe('sent');
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test_key');
    expect(headers['Idempotency-Key']).toMatch(/^waitlist-welcome-[0-9a-f]{32}$/);
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe('Runivo <hello@runivo.in>');
    expect(body.to).toEqual(['runner@example.com']);
    expect(body.subject).toContain('waitlist');
    expect(body.html).toContain('Pune');
  });

  it('uses the same idempotency key for the same address, a different one for another', async () => {
    const key = async (email: string) => {
      const f = ok();
      await sendWaitlistWelcome(email, null, f);
      return ((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Record<string, string>)['Idempotency-Key'];
    };
    expect(await key('a@b.co')).toBe(await key('a@b.co'));
    expect(await key('a@b.co')).not.toBe(await key('c@d.co'));
  });

  it('reports a failure instead of throwing when Resend answers with an error', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{"message":"bad"}', { status: 422 })) as unknown as typeof fetch;
    expect(await sendWaitlistWelcome('a@b.co', null, f)).toBe('failed');
  });

  it('reports a failure instead of throwing when the network fails', async () => {
    const f = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await sendWaitlistWelcome('a@b.co', null, f)).toBe('failed');
  });
});
