import { ArrowRight, Tag } from 'lucide-react';
import PageBanner from '../../components/PageBanner.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import useAsync from '../../hooks/useAsync.js';
import { api } from '../../api/client.js';

export default function CategoriesPage() {
  const { data, error, loading, reload } = useAsync(() => api('/categories'), []);
  const categories = (data?.data || []).filter((c) => c.availableProductCount > 0);

  return (
    <>
      <PageBanner eyebrow="Categories" title="Browse by category">
        Five aisles of everyday goods. Pick one to see everything we carry in it.
      </PageBanner>
      <section className="section">
        <div className="container">
          <ErrorNotice error={error} onRetry={reload} />
          {loading && !data ? <Loading /> : (
            <div className="categories">
              {categories.map((c) => (
                <a key={c.categoryId} className="category" href={`#/shop?category=${encodeURIComponent(c.categoryName)}`}>
                  <Tag size={34} strokeWidth={1} />
                  <h3>{c.categoryName}</h3>
                  <p className="category__desc">{c.description}</p>
                  <p className="category__ok">{c.availableProductCount} products</p>
                  <span className="link-arrow">Shop {c.categoryName} <ArrowRight size={16} strokeWidth={1.5} /></span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
