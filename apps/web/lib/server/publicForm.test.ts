import { describe, expect, it } from 'vitest';
import { guardPublicForm, sameOrigin } from './publicForm';

const post = (headers: Record<string, string>, body: unknown = { email: 'a@b.co' }) =>
  new Request('https://www.runivo.in/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json', host: 'www.runivo.in', ...headers }, body: JSON.stringify(body) });

describe('sameOrigin', () => {
  it('accepts the site itself and requests with no Origin', () => {
    expect(sameOrigin(post({ origin: 'https://www.runivo.in' }))).toBe(true);
    expect(sameOrigin(post({}))).toBe(true);
  });
  it('refuses another site, and a malformed Origin', () => {
    expect(sameOrigin(post({ origin: 'https://evil.example' }))).toBe(false);
    expect(sameOrigin(post({ origin: 'null' }))).toBe(false);
  });
});

describe('guardPublicForm', () => {
  const never = () => false;
  it('returns the body for a good same-site post', async () => {
    expect(await guardPublicForm(post({ origin: 'https://www.runivo.in' }), never, 'slow down')).toEqual({ email: 'a@b.co' });
  });
  it('answers 403 to a cross-site post', async () => {
    const r = await guardPublicForm(post({ origin: 'https://evil.example' }), never, 'slow down');
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).status).toBe(403);
  });
  it('answers 400 to a body that is not an object', async () => {
    const r = await guardPublicForm(post({}, [1, 2]), never, 'slow down');
    expect((r as Response).status).toBe(400);
  });
  it('quietly says ok to bots that fill the hidden field', async () => {
    const r = await guardPublicForm(post({}, { email: 'a@b.co', company_url: 'spam' }), never, 'slow down') as Response;
    expect(r.status).toBe(200);
  });
  it('answers 429 when the limiter says so', async () => {
    const r = await guardPublicForm(post({}), () => true, 'slow down') as Response;
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ error: 'slow down' });
  });
});
