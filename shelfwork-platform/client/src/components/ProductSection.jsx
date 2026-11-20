import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard.jsx';
import Loading from './Loading.jsx';

/** A titled row of product cards, used on the home page. */
export default function ProductSection({ eyebrow, title, products, loading, href, linkLabel = 'View all', paper = false }) {
  return (
    <section className={`section ${paper ? 'section--paper' : ''}`}>
      <div className="container">
        <div className="section__head section__head--split">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          {href && (
            <a href={href} className="link-arrow">
              {linkLabel} <ArrowRight size={16} strokeWidth={1.5} />
            </a>
          )}
        </div>
        {loading && !products ? <Loading /> : (
          <div className="pgrid">
            {(products || []).map((p) => (
              <ProductCard key={p.productId} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
