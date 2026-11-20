/** Label + control + error message, shared by every form. */
export default function Field({ id, label, error, hint, children, className = '' }) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
