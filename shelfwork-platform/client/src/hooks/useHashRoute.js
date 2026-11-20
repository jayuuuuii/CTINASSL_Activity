import { useEffect, useState } from 'react';

/** Routes look like #/shop?category=Hardware or #/admin/orders/ORD-1a2b3c4d. */
function parse() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: segments.join('/'), segments, query, params: new URLSearchParams(query) };
}

export function navigate(to) {
  window.location.hash = to.startsWith('#') ? to : `#/${to.replace(/^\//, '')}`;
}

export default function useHashRoute() {
  const [state, setState] = useState(parse);

  useEffect(() => {
    let lastPath = parse().path;
    const onChange = () => {
      const next = parse();
      setState(next);
      if (next.path !== lastPath) window.scrollTo({ top: 0 }); // keep position when only filters change
      lastPath = next.path;
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}
