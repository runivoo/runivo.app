import { describe, it, expect, afterEach } from 'vitest';
import { askClaude, parseJson, clip, AiError } from './ai';

const ENV = { ...process.env };
afterEach(() => { process.env = { ...ENV }; });

describe('ai helpers', () => {
  it('needs a key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(askClaude({ system: 's', user: 'u' })).rejects.toBeInstanceOf(AiError);
  });
  it('reads JSON even with words around it', () => {
    expect(parseJson<{ a: number }>('Here you go: {"a": 1} hope it helps')).toEqual({ a: 1 });
    expect(parseJson<number[]>('```json\n[1,2]\n```')).toEqual([1, 2]);
    expect(() => parseJson('no json here')).toThrow(AiError);
  });
  it('clips on a word boundary', () => {
    expect(clip('one two three four', 9)).toBe('one two');
    expect(clip(42, 5)).toBe('');
  });
});
