export default function Logo({ tone = 'light' }) {
  return (
    <span className={`logo logo--${tone}`}>
      <svg viewBox="0 0 40 40" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M5 14 20 6l15 8v16L20 38 5 30z" />
        <path d="M5 14l15 8 15-8M20 22v16" />
        <path d="M12.5 10l15 8" />
      </svg>
      <span className="logo__text">
        <strong>SHELFWORK</strong>
        <small>Inventory Co.</small>
      </span>
    </span>
  );
}
