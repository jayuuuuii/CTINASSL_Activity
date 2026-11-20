export default function OrderStatusBadge({ status }) {
  return <span className={`badge badge--${String(status).toLowerCase()}`}>{status}</span>;
}
