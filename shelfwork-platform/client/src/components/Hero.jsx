import { ArrowRight } from 'lucide-react';

/* Warehouse shelving drawn once, with a seeded generator so it looks the same every load. */
const PALETTE = ['#c9a46a', '#b88b52', '#d8bf93', '#8fb8b3', '#e6dcc6', '#a67c52', '#7ea5a0'];

function buildShelves() {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const boxes = [];
  const rows = [150, 300, 450, 600];
  rows.forEach((y, r) => {
    let x = 20;
    while (x < 1600) {
      if (rnd() < 0.12) x += 40 + rnd() * 60; // gap on the shelf
      const w = 55 + rnd() * 95;
      const h = 45 + rnd() * 85;
      boxes.push({
        key: `${r}-${x.toFixed(0)}`,
        x,
        y: y - h,
        w,
        h,
        fill: PALETTE[Math.floor(rnd() * PALETTE.length)],
      });
      x += w + 3 + rnd() * 10;
    }
  });
  return { boxes, rows };
}

const SHELVES = buildShelves();

function WarehouseArt() {
  return (
    <svg
      className="hero__art"
      viewBox="0 0 1600 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="1600" height="700" fill="#33423f" />
      {SHELVES.boxes.map((b) => (
        <g key={b.key}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} />
          <rect x={b.x + b.w / 2 - 3} y={b.y} width="6" height={b.h} fill="#000" opacity="0.12" />
          <rect x={b.x} y={b.y} width={b.w} height="3" fill="#fff" opacity="0.25" />
        </g>
      ))}
      {SHELVES.rows.map((y) => (
        <rect key={y} x="0" y={y} width="1600" height="9" fill="#1f2a28" />
      ))}
      {[0, 400, 800, 1200, 1592].map((x) => (
        <rect key={x} x={x} y="0" width="8" height="700" fill="#1f2a28" />
      ))}
    </svg>
  );
}

export default function Hero({ eyebrow, title, lead, cta, ctaHref }) {
  return (
    <section className="hero">
      <WarehouseArt />
      <div className="hero__overlay" />
      <div className="container hero__content">
        <p className="eyebrow eyebrow--light">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hero__lead">{lead}</p>
        <a href={ctaHref} className="btn btn--primary btn--lg">
          {cta} <ArrowRight size={18} strokeWidth={1.5} />
        </a>
      </div>
    </section>
  );
}
