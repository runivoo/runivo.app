/** Sends a public form as JSON and turns every outcome into plain data, so the forms only decide what to show. */
export interface FormReply { ok: boolean; alreadyJoined?: boolean; error?: string }

export async function postForm(url: string, payload: unknown): Promise<FormReply> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = (await res.json().catch(() => ({}))) as FormReply;
    if (res.ok && data.ok) return { ok: true, alreadyJoined: data.alreadyJoined };
    return { ok: false, error: data.error ?? 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, error: 'Couldn’t reach us. Check your connection and try again.' };
  }
}
