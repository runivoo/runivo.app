/**
 * Plain question-and-answer list on native <details>: no JavaScript, keyboard
 * and screen-reader friendly by default. Styles are in styles/home.css.
 */
export function Faq({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="faq">
      {items.map(([q, a], i) => (
        <details key={q} className="faq-item" open={i === 0}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
