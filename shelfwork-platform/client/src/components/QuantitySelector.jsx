import { Minus, Plus } from 'lucide-react';

/** − [n] + control that never goes below `min` or above `max`. */
export default function QuantitySelector({ value, max, min = 1, onChange, disabled = false, label = 'Quantity' }) {
  const set = (n) => {
    const v = Math.max(min, Math.min(max, Number.isFinite(n) ? Math.floor(n) : min));
    if (v !== value) onChange(v);
  };
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - 1)} disabled={disabled || value <= min} aria-label="Decrease">
        <Minus size={15} strokeWidth={1.5} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => set(Number(e.target.value))}
        aria-label={label}
      />
      <button type="button" onClick={() => set(value + 1)} disabled={disabled || value >= max} aria-label="Increase">
        <Plus size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}
