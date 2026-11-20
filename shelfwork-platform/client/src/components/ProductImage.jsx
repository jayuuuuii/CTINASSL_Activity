import { useState } from 'react';
import { Package } from 'lucide-react';

/** Product photo with a quiet fallback when there is no image (or it fails to load). */
export default function ProductImage({ product, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false);
  const src = product?.imageUrl;
  return (
    <div className={`pimg pimg--${size} ${className}`}>
      {src && !broken ? (
        <img src={src} alt={product.productName} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="pimg__fallback" aria-hidden="true">
          <Package size={size === 'sm' ? 20 : 44} strokeWidth={1} />
        </div>
      )}
    </div>
  );
}
