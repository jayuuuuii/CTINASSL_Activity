export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} strokeWidth={1} />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
