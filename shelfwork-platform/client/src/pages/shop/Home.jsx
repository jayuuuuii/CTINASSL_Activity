import { Gauge, Banknote, Truck, Store, ArrowRight, Tag } from 'lucide-react';
import Hero from '../../components/Hero.jsx';
import Features from '../../components/Features.jsx';
import ProductSection from '../../components/ProductSection.jsx';
import CallToAction from '../../components/CallToAction.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const PROMISES = [
  { icon: Gauge, title: 'Live stock counts', text: 'Every product shows how many are on the shelf right now, so nothing you order is imaginary.' },
  { icon: Banknote, title: 'Cash on delivery', text: 'Pay when your parcel arrives, or use the quick simulated online payment at checkout.' },
  { icon: Truck, title: 'Track every order', text: 'Follow your order from confirmed to delivered, and cancel early orders yourself.' },
  { icon: Store, title: 'Local suppliers', text: 'We stock goods from Philippine makers and distributors we know by name.' },
];

export default function Home() {
  const { user } = useAuth();
  const featured = useAsync(() => api('/products', { query: { featured: 'true', limit: 4, inStock: 'true' } }), []);
  const newest = useAsync(() => api('/products', { query: { sortBy: 'createdAt', order: 'desc', limit: 4 } }), []);
  const available = useAsync(() => api('/products', { query: { inStock: 'true', sortBy: 'productName', order: 'asc', limit: 8 } }), []);
  const categories = useAsync(() => api('/categories'), []);

  return (
    <>
      <Hero
        eyebrow="Live stock, honest prices"
        title={<>Everyday goods<br />straight from<br />the stockroom</>}
        lead="Packaging, kitchenware, office supplies, electronics and hardware for homes and small businesses. Browse what is on the shelf today and have it delivered to your door."
        cta="Shop now"
        ctaHref="#/shop"
      />

      <Features eyebrow="Why shop with us" title="A small shop that runs on real numbers" items={PROMISES} />

      <ProductSection eyebrow="Hand-picked" title="Featured products" products={featured.data?.data} loading={featured.loading} href="#/shop?featured=true" paper />

      <section className="section">
        <div className="container">
          <div className="section__head section__head--split">
            <div>
              <p className="eyebrow">Browse</p>
              <h2>Shop by category</h2>
            </div>
            <a href="#/categories" className="link-arrow">All categories <ArrowRight size={16} strokeWidth={1.5} /></a>
          </div>
          <ErrorNotice error={categories.error} onRetry={categories.reload} />
          <div className="cat-tiles">
            {(categories.data?.data || []).filter((c) => c.availableProductCount > 0).map((c) => (
              <a key={c.categoryId} href={`#/shop?category=${encodeURIComponent(c.categoryName)}`} className="cat-tile">
                <Tag size={30} strokeWidth={1} />
                <strong>{c.categoryName}</strong>
                <span>{c.availableProductCount} products</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <ProductSection eyebrow="Just in" title="New arrivals" products={newest.data?.data} loading={newest.loading} href="#/shop?sort=newest" paper />

      <ProductSection eyebrow="Ready to ship" title="Available now" products={available.data?.data} loading={available.loading} href="#/shop?inStock=true" linkLabel="See everything in stock" />

      {featured.error && <div className="container"><ErrorNotice error={featured.error} onRetry={() => { featured.reload(); newest.reload(); available.reload(); }} /></div>}

      <CallToAction
        title={user ? 'Ready for your next order?' : 'Create an account in a minute'}
        text={user ? 'Your cart and order history are saved to your account.' : 'Save your cart, check out faster and follow every order from your account page.'}
        cta={user ? 'Continue shopping' : 'Create account'}
        href={user ? '#/shop' : '#/register'}
      />
    </>
  );
}
