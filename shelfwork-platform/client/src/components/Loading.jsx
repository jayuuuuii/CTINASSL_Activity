export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="loading__bar" />
      <span>{label}</span>
    </div>
  );
}
