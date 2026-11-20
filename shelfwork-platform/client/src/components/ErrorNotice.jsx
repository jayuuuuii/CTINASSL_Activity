import { AlertTriangle } from 'lucide-react';

export default function ErrorNotice({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="notice notice--error" role="alert">
      <AlertTriangle size={20} strokeWidth={1.5} />
      <div>
        <p>{error.message || String(error)}</p>
        {error.details?.items && (
          <ul>
            {error.details.items.map((i) => (
              <li key={i.productId}>
                <strong>{i.productName}</strong>: {i.problem}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onRetry && (
        <button className="btn btn--outline btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
