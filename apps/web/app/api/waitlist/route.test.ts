import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const sendWelcome = vi.fn().mockResolvedValue('sent');

vi.mock('next/server', () => ({ after: (fn: () => unknown) => { fn(); } }));
vi.mock('@/lib/waitlistEmail', () => ({ sendWaitlistWelcome: (...a: unknown[]) => sendWelcome(...a) }));
vi.mock('@/lib/adminServer', async orig => ({
  ...(await orig<typeof import('@/lib/adminServer')>()),
  serviceClient: () => ({ rpc }),
}));

import { POST } from './route';

let n = 0;
const post = (body: unknown) =>
  POST(new Request('http://localhost/api/waitlist', {
    method: 'POST',
    // A different address each time, so the per-IP limiter never interferes.
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++n}` },
    body: JSON.stringify(body),
  }));

beforeEach(() => { rpc.mockReset(); sendWelcome.mockClear(); });

describe('POST /api/waitlist', () => {
  it('records the platform and campaign that brought the sign-up', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await post({ email: 'a@example.com', touch: { source: 'ig', campaign: 'Launch Week', referrer: 'l.instagram.com' } });
    expect(rpc).toHaveBeenCalledWith('join_waitlist', expect.objectContaining({
      p_platform: 'instagram', p_campaign: 'launch-week', p_referrer: 'l.instagram.com',
    }));
  });

  it('saves a new address, answers 201 and sends the welcome email', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const res = await post({ email: 'New@Example.com', city: 'Pune' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('join_waitlist', {
      p_email: 'new@example.com', p_city: 'Pune', p_source: 'web',
      p_platform: 'direct', p_campaign: null, p_medium: null, p_referrer: null,
    });
    expect(sendWelcome).toHaveBeenCalledWith('new@example.com', 'Pune');
  });

  it('tells a repeat address it is already on the list, and does not email it again', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const res = await post({ email: 'again@example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadyJoined: true });
    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it('lowercases the address, so Same@X.com and same@x.com are one person', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await post({ email: 'Same@X.com' });
    expect((rpc.mock.calls[0][1] as { p_email: string }).p_email).toBe('same@x.com');
  });

  it('refuses a bad address without touching the database', async () => {
    const res = await post({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('ignores the hidden honeypot field', async () => {
    const res = await post({ email: 'bot@example.com', company_url: 'http://spam' });
    expect(await res.json()).toEqual({ ok: true });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it('does not leak database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: 'relation "waitlist" does not exist' } });
    const res = await post({ email: 'x@example.com' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('relation');
  });
});
