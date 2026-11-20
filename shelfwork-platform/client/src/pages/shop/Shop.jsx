import { useEffect, useState } from 'react';
import { Search, PackageSearch } from 'lucide-react';
import PageBanner from '../../components/PageBanner.jsx';
import ProductCard from '../../components/ProductCard.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loading from '../../components/Loading.jsx';
import ErrorNotice from '../../components/ErrorNotice.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import useAsync from '../../hooks/useAsync.js';
import useDebounced from '../../hooks/useDebounced.js';
import { api } from '../../api/client.js';

const SORTS = {
  newest: { label: 'Newest arrivals', sortBy: 'createdAt', order: 'desc' },
  'price-asc': { label: 'Price: low to high', sortBy: 'price', order: 'asc' },
  'price-desc': { label: 'Price: high to low', sortBy: 'price', order: 'desc' },
  name: { label: 'Name: A to Z', sortBy: 'productName', order: 'asc' },
};

/** Filters live in the URL (#/shop?category=...&sort=...), so they survive refresh and can be shared. */
export default function Shop({ params }) {
  const category = params.get('category') || '';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'newest';
  const inStock = params.get('inStock') === 'true';
  const featured = params.get('featured') === 'true';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(params.get('q') || '');
  const debounced = useDebounced(search.trim());

  const setParam = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in changes)) next.delete('page');
    window.location.hash = `#/shop${next.toString() ? `?${next}` : ''}`;
  };

  useEffect(() => {
    if (debounced !== (params.get('q') || '')) setParam({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const categories = useAsync(() => api('/categories'), []);
  const products = useAsync(
    () => api('/products', { query: { search: params.get('q') || '', category, sortBy: SORTS[sort].sortBy, order: SORTS[sort].order, inStock: inStock ? 'true' : '', featured: featured ? 'true' : '', page, limit: 12 } }),
    [params.toString()]
  );

  const title = featured ? 'Featured products' : category || 'All products';

  return (
    <>
      <PageBanner eyebrow="Shop" title={title}>
        Prices include VAT. Stock counts are live: what you see is what we can ship today.
      </PageBanner>

      <section className="section section--tight">
        <div className="container">
          <div className="toolbar">
            <div className="search">
              <Search size={18} strokeWidth={1.5} />
              <input type="search" placeholder="Search products by name" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
            </div>
            <select value={sort} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sort products">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
            <label className="check check--inline">
              <input type="checkbox" checked={inStock} onChange={(e) => setParam({ inStock: e.target.checked ? 'true' : '' })} /> In stock only
            </label>
          </div>

          <div className="chips" role="tablist" aria-label="Categories">
            <button role="tab" aria-selected={!category && !featured} className={`chip ${!category && !featured ? 'is-active' : ''}`} onClick={() => setParam({ category: '', featured: '' })}>All</button>
            {(categories.data?.data || []).filter((c) => c.availableProductCount > 0).map((c) => (
              <button key={c.categoryId} role="tab" aria-selected={category === c.categoryName} className={`chip ${category === c.categoryName ? 'is-active' : ''}`} onClick={() => setParam({ category: c.categoryName, featured: '' })}>
                {c.categoryName}
              </button>
            ))}
          </div>

          <ErrorNotice error={products.error} onRetry={products.reload} />
          {products.loading && !products.data ? (
            <Loading label="Loading products…" />
          ) : products.data && products.data.data.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No products match" action={<button className="btn btn--outline btn--sm" onClick={() => { setSearch(''); window.location.hash = '#/shop'; }}>Clear filters</button>}>
              Try a different search or category.
            </EmptyState>
          ) : products.data ? (
            <>
              <p className="count">{products.data.meta.totalItems} products</p>
              <div className={`pgrid ${products.loading ? 'is-loading' : ''}`}>
                {products.data.data.map((p) => <ProductCard key={p.productId} product={p} />)}
              </div>
              <Pagination meta={products.data.meta} onPage={(p) => setParam({ page: String(p) })} />
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
