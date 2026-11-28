/** A field people never see and bots like to fill. The form routes (lib/server/publicForm.ts) drop any submission that has it filled. */
export function Honeypot({ id }: { id: string }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
      <label htmlFor={id}>Leave this empty</label>
      <input id={id} name="company_url" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
