import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderBroadcast, addToSegment, UNSUBSCRIBE } from './broadcast';

const b = { subject: 'We are live', preheader: 'Open the app', heading: 'Runivo is live.', body: 'First paragraph.\n\nSecond <b>one</b>.', button_label: 'Get the app', button_url: 'https://runivo.in/app' };
const ENV = { ...process.env };
afterEach(() => { process.env = { ...ENV }; vi.unstubAllGlobals(); });

describe('renderBroadcast', () => {
  it('turns blank lines into paragraphs and escapes what was typed', () => {
    const { html } = renderBroadcast(b);
    expect(html).toContain('First paragraph.</p>');
    expect(html).toContain('Second &lt;b&gt;one&lt;/b&gt;.');
    expect(html).not.toContain('<b>one</b>');
  });
  it("carries Resend's unsubscribe link when sending, a dead link for tests", () => {
    expect(renderBroadcast(b).html).toContain(UNSUBSCRIBE);
    expect(renderBroadcast(b, '#').html).not.toContain(UNSUBSCRIBE);
  });
  it('drops a button whose link is not https', () => {
    expect(renderBroadcast({ ...b, button_url: 'javascript:alert(1)' }).html).not.toContain('Get the app');
  });
});

describe('addToSegment', () => {
  it('never sends "unsubscribed", and adds an existing contact to the segment', async () => {
    process.env.RESEND_ADMIN_KEY = 're_full';
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body ?? '') });
      return calls.length === 1
        ? new Response(JSON.stringify({ message: 'Contact already exists' }), { status: 409 })
        : new Response('{}', { status: 200 });
    }));
    await addToSegment('a@b.co', 'seg_1');
    expect(calls[0].url).toBe('https://api.resend.com/contacts');
    expect(calls[0].body).not.toContain('unsubscribed');
    expect(calls[1].url).toBe('https://api.resend.com/contacts/a%40b.co/segments/seg_1');
  });
});
