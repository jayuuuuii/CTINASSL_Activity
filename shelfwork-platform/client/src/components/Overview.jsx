import { formatCurrency } from '../utils.js';

/** Editorial stock-health figures plus a proportion bar. `stats` comes from the dashboard API. */
export default function Overview({ stats }) {
  const total = stats.totalProducts || 0;
  const pct = (n) => (total ? (n / total) * 100 : 0);

  const figures = [
    { label: 'Total products', value: total, note: 'distinct items on file' },
    { label: 'Stock units', value: stats.availableStockUnits.toLocaleString(), note: 'units on the shelves' },
    { label: 'Low stock items', value: stats.lowStockItems, note: 'at or below threshold', tone: 'warn', href: '#/admin/stock?view=low' },
    { label: 'Out of stock', value: stats.outOfStockItems, note: 'need restocking now', tone: 'danger', href: '#/admin/stock?view=out' },
  ];

  return (
    <div className="overview-block">
      <div className="overview__figures overview__figures--row">
        {figures.map((f) => {
          const inner = (
            <>
              <span className="figure__value">{f.value}</span>
              <span className="figure__label">{f.label}</span>
              <span className="figure__note">{f.note}</span>
            </>
          );
          return f.href ? (
            <a href={f.href} className={`figure figure--link ${f.tone ? `figure--${f.tone}` : ''}`} key={f.label}>{inner}</a>
          ) : (
            <div className={`figure ${f.tone ? `figure--${f.tone}` : ''}`} key={f.label}>{inner}</div>
          );
        })}
      </div>
      <div className="healthbar" role="img" aria-label="Share of products by stock status">
        <span className="healthbar__seg healthbar__seg--in" style={{ width: `${pct(stats.wellStockedItems)}%` }} />
        <span className="healthbar__seg healthbar__seg--low" style={{ width: `${pct(stats.lowStockItems)}%` }} />
        <span className="healthbar__seg healthbar__seg--out" style={{ width: `${pct(stats.outOfStockItems)}%` }} />
      </div>
      <ul className="healthbar__legend">
        <li><i className="dot dot--in" /> {stats.wellStockedItems} well stocked</li>
        <li><i className="dot dot--low" /> {stats.lowStockItems} running low</li>
        <li><i className="dot dot--out" /> {stats.outOfStockItems} out of stock</li>
        <li className="healthbar__value">Stock value {formatCurrency(stats.totalInventoryValue)}</li>
      </ul>
    </div>
  );
}
