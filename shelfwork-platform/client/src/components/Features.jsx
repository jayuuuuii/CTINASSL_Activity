import { ArrowRight } from 'lucide-react';

/** Four columns of outlined icons, short copy and a small link. Items are passed in by the page. */
export default function Features({ eyebrow, title, items }) {
  return (
    <section className="section features">
      <div className="container">
        <div className="section__head section__head--center">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        <div className="features__grid">
          {items.map(({ icon: Icon, title: t, text, href, cta }) => (
            <article className="feature" key={t}>
              <Icon size={54} strokeWidth={1} className="feature__icon" />
              <h3>{t}</h3>
              <p>{text}</p>
              {href && (
                <a href={href} className="btn btn--outline btn--sm">
                  {cta} <ArrowRight size={14} strokeWidth={1.5} />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
