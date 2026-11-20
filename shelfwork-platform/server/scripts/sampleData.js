/**
 * Builds a complete, internally consistent sample dataset:
 * categories, suppliers, products (+ SVG images), users, orders, payments, carts and
 * a stock-transaction history in which every product's quantity adds up exactly.
 * Used by `npm run reset-data` and by the automated tests.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../utils/auth.js';
import { SHIPPING } from '../config.js';

export const SAMPLE_ACCOUNTS = {
  admin: { email: 'admin@shelfwork.example', password: 'Admin@12345' },
  customerPassword: 'Customer@123',
};

const DAY = 86400000;
const pad = (n) => String(n).padStart(8, '0');
const round2 = (n) => Math.round(n * 100) / 100;

const CATEGORIES = [
  ['Packaging', 'Boxes, mailers, labels and shipping materials.'],
  ['Kitchen & Pantry', 'Drinkware, brewing gear and pantry goods.'],
  ['Office Supplies', 'Stationery and desk accessories.'],
  ['Electronics', 'Cables, scanners, lighting and small devices.'],
  ['Hardware', 'Brackets, tape, carts and warehouse equipment.'],
];

const SUPPLIERS = [
  ['Luzon Paper Supply', 'Maria Santos', 'orders@luzonpaper.example', '+63 917 555 0101', '12 Rizal Ave, Quezon City, Metro Manila'],
  ['PrintMark Trading', 'Joel Reyes', 'sales@printmark.example', '+63 918 555 0102', '88 Shaw Blvd, Mandaluyong, Metro Manila'],
  ['Harbor Housewares', 'Angela Cruz', 'hello@harborhousewares.example', '+63 919 555 0103', '5 Pier Road, Cebu City'],
  ['Benguet Highland Roasters', 'Ramon Dela Cruz', 'trade@benguetroasters.example', '+63 920 555 0104', '41 Session Road, Baguio City'],
  ['Paperworks Manila', 'Liza Mercado', 'accounts@paperworksmanila.example', '+63 921 555 0105', '230 Recto Ave, Manila'],
  ['Cebu Woodcraft', 'Paolo Villanueva', 'studio@cebuwoodcraft.example', '+63 922 555 0106', '17 Mactan Road, Lapu-Lapu City'],
  ['Volt Distribution', 'Kevin Tan', 'b2b@voltdistribution.example', '+63 923 555 0107', '9 Ortigas Center, Pasig City'],
  ['Brightline Imports', 'Grace Lim', 'orders@brightline.example', '+63 924 555 0108', '300 Roxas Blvd, Pasay City'],
  ['Metro Steel & Fasteners', 'Dennis Ocampo', 'sales@metrosteel.example', '+63 925 555 0109', 'Lot 4, Industrial Park, Calamba, Laguna'],
];

// [name, category, description, supplier, price, threshold, createdDaysAgo, finalQty, manualOuts[[daysAgo, qty, reason]], featured, available]
const PRODUCTS = [
  ['Kraft Mailer Box, Medium', 'Packaging', 'Corrugated kraft mailer box, 30 x 22 x 8 cm. Sold in bundles of ten.', 'Luzon Paper Supply', 38, 150, 50, 410, [[20, 30, 'Wholesale pickup']], false, true],
  ['Thermal Label Roll 4x6', 'Packaging', 'Direct thermal shipping labels, 500 labels per roll, 25 mm core.', 'PrintMark Trading', 215, 25, 45, 17, [[10, 32, 'Wholesale pickup'], [4, 10, 'Used for in-house shipping']], false, true],
  ['Stainless Steel Tumbler 500ml', 'Kitchen & Pantry', 'Double-wall insulated tumbler with a leak-resistant lid. Keeps drinks cold for 24 hours.', 'Harbor Housewares', 420, 30, 40, 94, [[15, 14, 'Counter sales']], true, true],
  ['Ceramic Pour-Over Dripper', 'Kitchen & Pantry', 'Size 02 cone dripper in matte cream glaze. Next shipment is on its way.', 'Harbor Housewares', 680, 12, 4, 0, [[3, 12, 'Café bulk order']], false, true],
  ['Whole Bean Coffee 1kg', 'Kitchen & Pantry', 'Medium roast Benguet Arabica, roasted weekly. Valve-sealed bag.', 'Benguet Highland Roasters', 890, 20, 30, 43, [[20, 10, 'Counter sales']], true, true],
  ['A5 Dot Grid Notebook', 'Office Supplies', '120 gsm cream paper, 160 pages, lay-flat binding.', 'Paperworks Manila', 165, 60, 35, 165, [[16, 40, 'School bulk order']], false, true],
  ['Gel Pen 0.5mm, Black (12 pk)', 'Office Supplies', 'Quick-dry gel ink, retractable, box of twelve.', 'Paperworks Manila', 240, 20, 28, 13, [[14, 16, 'Office order'], [6, 10, 'Counter sales']], false, true],
  ['Desk Organizer, Walnut', 'Office Supplies', 'Solid walnut organizer with three compartments and a phone slot.', 'Cebu Woodcraft', 1250, 8, 25, 26, [], true, true],
  ['USB-C Charging Cable 2m', 'Electronics', 'Braided 60W USB-C to USB-C cable, 2 metres.', 'Volt Distribution', 320, 50, 22, 148, [], true, true],
  ['Wireless Barcode Scanner', 'Electronics', '2D wireless scanner with USB dongle and charging cradle.', 'Volt Distribution', 3450, 5, 6, 3, [[5, 3, 'Sold to retail client']], false, true],
  ['LED Task Lamp', 'Electronics', 'Dimmable LED lamp with adjustable arm and warm-to-cool light.', 'Brightline Imports', 990, 10, 20, 3, [[12, 9, 'Counter sales'], [7, 8, 'Counter sales']], false, true],
  ['Heavy-Duty Shelf Bracket Pair', 'Hardware', 'Powder-coated steel brackets, 30 cm, supports up to 40 kg per pair.', 'Metro Steel & Fasteners', 275, 25, 18, 86, [], false, true],
  ['Pallet Strapping Tape, 48mm', 'Hardware', 'Clear polypropylene tape, 100 m per roll.', 'Metro Steel & Fasteners', 95, 80, 17, 256, [], false, true],
  ['Rolling Stock Cart', 'Hardware', 'Three-shelf steel utility cart with locking casters.', 'Metro Steel & Fasteners', 4200, 3, 9, 0, [[7, 4, 'Sold to warehouse client']], false, true],
  ['Holiday Gift Box Set', 'Packaging', 'Rigid gift box with tissue and ribbon. Seasonal: hidden from the shop until December.', 'Luzon Paper Supply', 145, 10, 2, 25, [], false, false],
];

const CUSTOMERS = [
  ['Andrea Bautista', 'andrea@example.com', '+63 917 123 4501', 'Unit 4B, 21 Kalayaan Ave, Diliman, Quezon City', 'active'],
  ['Miguel Santos', 'miguel@example.com', '+63 918 234 5602', '88 Mabini St, Poblacion, Makati City', 'active'],
  ['Carla Reyes', 'carla@example.com', '+63 919 345 6703', '15 Gorordo Ave, Lahug, Cebu City', 'active'],
  ['Paolo Garcia', 'paolo@example.com', '+63 920 456 7804', '7 Session Road, Baguio City', 'disabled'],
];

const NOTES = {
  Confirmed: 'Order confirmed',
  Processing: 'Items picked and being packed',
  Shipped: 'Handed to courier',
  Delivered: 'Delivered to customer',
};

// customer index (0-based into CUSTOMERS), createdDaysAgo, payment, items [[productIndex(1-based), qty]],
// steps [[status, daysAgo]], cancel {daysAgo, by, reason}
const ORDERS = [
  { c: 0, d: 12, pay: 'COD', items: [[3, 2], [6, 3]], steps: [['Confirmed', 11.9], ['Processing', 11.5], ['Shipped', 11], ['Delivered', 9]] },
  { c: 1, d: 8, pay: 'ONLINE_SIMULATED', items: [[5, 1], [9, 2]], steps: [['Confirmed', 7.9], ['Processing', 7.5], ['Shipped', 7], ['Delivered', 5]] },
  { c: 2, d: 5, pay: 'COD', items: [[11, 1]], steps: [], cancel: { d: 4.8, by: 'customer', reason: 'Ordered by mistake' } },
  { c: 0, d: 3, pay: 'ONLINE_SIMULATED', items: [[8, 1], [7, 1]], steps: [['Confirmed', 2.9], ['Processing', 2.5], ['Shipped', 1.5]] },
  { c: 1, d: 1, pay: 'COD', items: [[1, 10], [13, 4]], steps: [['Confirmed', 0.9], ['Processing', 0.6]] },
  { c: 2, d: 0.2, pay: 'COD', items: [[6, 2], [2, 1]], steps: [] },
  { c: 0, d: 0.1, pay: 'ONLINE_SIMULATED', items: [[12, 2], [8, 2]], steps: [['Confirmed', 0.05]] },
];

const ICONS = {
  Packaging: '<path d="M260 250 400 180l140 70v150l-140 70-140-70z" /><path d="M260 250l140 70 140-70M400 320v150" /><path d="M330 215l140 70v40" />',
  'Kitchen & Pantry': '<path d="M330 200h140l-15 260h-110z" /><path d="M322 200h156" /><path d="M340 250h120" /><path d="M470 260c45 0 45 90 0 90" />',
  'Office Supplies': '<rect x="300" y="180" width="200" height="270" rx="6" /><path d="M330 180v270" /><path d="M360 240h110M360 280h110M360 320h110M360 360h70" />',
  Electronics: '<path d="M360 190v60M440 190v60" /><rect x="330" y="250" width="140" height="90" rx="12" /><path d="M400 340v40c0 40-60 40-60 80" />',
  Hardware: '<path d="M300 200h40v190h150v40H300z" /><circle cx="320" cy="230" r="8" /><circle cx="460" cy="410" r="8" /><path d="M360 300 470 190" />',
};
const ACCENTS = ['#2aa6a0', '#c9a46a', '#8fb8b3', '#b88b52', '#7ea5a0'];

function productSvg(name, category, index) {
  const accent = ACCENTS[index % ACCENTS.length];
  const cx = 180 + ((index * 97) % 440);
  const cy = 150 + ((index * 61) % 300);
  const label = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${label}">
  <rect width="800" height="600" fill="#f2ead7"/>
  <circle cx="${cx}" cy="${cy}" r="210" fill="${accent}" opacity="0.18"/>
  <rect x="0" y="520" width="800" height="80" fill="#ece3cd"/>
  <g fill="none" stroke="#1b7c78" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">${ICONS[category]}</g>
</svg>
`;
}

/** Returns every collection as plain arrays. `now` makes the dates reproducible in tests. */
export async function buildSampleData(now = Date.now()) {
  const at = (daysAgo) => new Date(now - daysAgo * DAY).toISOString();

  const categories = CATEGORIES.map(([categoryName, description], i) => ({
    categoryId: `CAT-${pad(i + 1)}`, categoryName, description, createdAt: at(70), updatedAt: at(70),
  }));
  const suppliers = SUPPLIERS.map(([supplierName, contactPerson, email, phone, address], i) => ({
    supplierId: `SUP-${pad(i + 1)}`, supplierName, contactPerson, email, phone, address, createdAt: at(65), updatedAt: at(65),
  }));
  const products = PRODUCTS.map(([productName, category, description, supplier, price, lowStockThreshold, created, quantity, , isFeatured, isAvailable], i) => ({
    productId: `PRD-${pad(i + 1)}`, productName, category, description, supplier, quantity, price, lowStockThreshold,
    imageUrl: `/uploads/products/PRD-${pad(i + 1)}.svg`, isAvailable, isFeatured, createdAt: at(created), updatedAt: at(created),
  }));
  const productAt = (n) => products[n - 1];

  // ---- Users ----
  const users = [
    {
      userId: 'USR-00000001', fullName: 'Store Administrator', email: SAMPLE_ACCOUNTS.admin.email, phone: '+63 2 8555 0100',
      address: 'Shelfwork Warehouse, Pasig City', passwordHash: await hashPassword(SAMPLE_ACCOUNTS.admin.password),
      role: 'admin', status: 'active', tokenVersion: 0, createdAt: at(70), updatedAt: at(70), lastLoginAt: null,
    },
  ];
  const customerHash = await hashPassword(SAMPLE_ACCOUNTS.customerPassword);
  CUSTOMERS.forEach(([fullName, email, phone, address, status], i) => {
    users.push({
      userId: `USR-${pad(i + 2)}`, fullName, email, phone, address, passwordHash: customerHash,
      role: 'customer', status, tokenVersion: 0, createdAt: at(40 - i * 6), updatedAt: at(40 - i * 6), lastLoginAt: at(Math.max(0.1, 3 - i)),
    });
  });

  // ---- Stock events (built first, numbered once sorted) ----
  const events = []; // { productIndex, daysAgo, type, qty, reason, referenceType, referenceId, performedBy }
  PRODUCTS.forEach((row, i) => {
    for (const [daysAgo, qty, reason] of row[8])
      events.push({ p: i + 1, daysAgo, type: 'OUT', qty, reason, referenceType: 'MANUAL', referenceId: null, performedBy: 'USR-00000001' });
  });

  // ---- Orders and payments ----
  const orders = [];
  const payments = [];
  ORDERS.forEach((spec, i) => {
    const orderId = `ORD-${pad(i + 1)}`;
    const user = users[spec.c + 1];
    const items = spec.items.map(([n, quantity]) => {
      const p = productAt(n);
      return { productId: p.productId, productName: p.productName, imageUrl: p.imageUrl, unitPrice: p.price, quantity, lineTotal: round2(p.price * quantity) };
    });
    const subtotal = round2(items.reduce((s, x) => s + x.lineTotal, 0));
    const shippingFee = subtotal >= SHIPPING.freeOver ? 0 : SHIPPING.flatFee;
    const total = round2(subtotal + shippingFee);
    const history = [{ status: 'Pending', at: at(spec.d), by: 'customer', note: 'Order placed' }];
    for (const [status, d] of spec.steps) history.push({ status, at: at(d), by: 'admin', note: NOTES[status] });

    let status = history[history.length - 1].status;
    let paymentStatus = spec.pay === 'ONLINE_SIMULATED' ? 'PAID' : 'PENDING';
    if (status === 'Delivered') paymentStatus = 'PAID';

    for (const [n, qty] of spec.items)
      events.push({ p: n, daysAgo: spec.d, type: 'OUT', qty, reason: `Customer order ${orderId}`, referenceType: 'ORDER', referenceId: orderId, performedBy: user.userId });

    const order = {
      orderId, userId: user.userId,
      customer: { fullName: user.fullName, email: user.email, phone: user.phone, address: user.address },
      items, subtotal, shippingFee, total, paymentMethod: spec.pay, paymentStatus, paymentId: `PAY-${pad(i + 1)}`,
      status, statusHistory: history, notes: i === 0 ? 'Please call before delivery.' : '',
      idempotencyKey: `sample-order-${i + 1}`, createdAt: at(spec.d), updatedAt: history[history.length - 1].at,
    };

    if (spec.cancel) {
      for (const [n, qty] of spec.items)
        events.push({ p: n, daysAgo: spec.cancel.d, type: 'IN', qty, reason: `Order ${orderId} cancelled: stock restored`, referenceType: 'ORDER', referenceId: orderId, performedBy: user.userId });
      paymentStatus = paymentStatus === 'PAID' ? 'REFUNDED' : 'VOIDED';
      Object.assign(order, {
        status: 'Cancelled', paymentStatus, cancelledAt: at(spec.cancel.d), cancelledBy: spec.cancel.by, cancelReason: spec.cancel.reason,
        updatedAt: at(spec.cancel.d),
      });
      order.statusHistory.push({ status: 'Cancelled', at: at(spec.cancel.d), by: spec.cancel.by, note: spec.cancel.reason });
      status = 'Cancelled';
    }
    orders.push(order);

    payments.push({
      paymentId: order.paymentId, orderId, userId: user.userId, method: spec.pay, amount: total, status: order.paymentStatus,
      reference: spec.pay === 'ONLINE_SIMULATED' ? `SIM-${(0xa1b2c3d4e5 + i * 7919).toString(16).toUpperCase().slice(0, 10)}` : null,
      simulated: true, createdAt: at(spec.d), updatedAt: order.updatedAt,
    });
  });

  // ---- Opening stock: whatever makes the history end at today's quantity ----
  products.forEach((p, i) => {
    const own = events.filter((e) => e.p === i + 1);
    const out = own.filter((e) => e.type === 'OUT').reduce((s, e) => s + e.qty, 0);
    const back = own.filter((e) => e.type === 'IN').reduce((s, e) => s + e.qty, 0);
    const opening = p.quantity + out - back;
    if (opening > 0)
      events.push({ p: i + 1, daysAgo: PRODUCTS[i][6], type: 'IN', qty: opening, reason: 'Initial stock', referenceType: 'MANUAL', referenceId: null, performedBy: 'USR-00000001', first: true });
  });

  // Oldest first (opening stock before anything else on the same day), then number and replay.
  events.sort((a, b) => b.daysAgo - a.daysAgo || (b.first ? 1 : 0) - (a.first ? 1 : 0));
  const running = new Map();
  const transactions = events.map((e, i) => {
    const product = productAt(e.p);
    const previousQuantity = running.get(e.p) || 0;
    const newQuantity = e.type === 'IN' ? previousQuantity + e.qty : previousQuantity - e.qty;
    if (newQuantity < 0) throw new Error(`Sample data would make ${product.productName} negative`);
    running.set(e.p, newQuantity);
    return {
      transactionId: `TXN-${pad(i + 1)}`, productId: product.productId, productName: product.productName, type: e.type,
      quantity: e.qty, previousQuantity, newQuantity, reason: e.reason, referenceType: e.referenceType,
      referenceId: e.referenceId, performedBy: e.performedBy, createdAt: at(e.daysAgo),
    };
  });
  products.forEach((p, i) => {
    if ((running.get(i + 1) || 0) !== p.quantity) throw new Error(`Sample history does not add up for ${p.productName}`);
    const last = transactions.filter((t) => t.productId === p.productId).pop();
    if (last) p.updatedAt = last.createdAt;
  });

  const carts = [{ userId: 'USR-00000004', items: [{ productId: 'PRD-00000005', quantity: 1, addedAt: at(0.05) }], updatedAt: at(0.05) }];

  return {
    categories,
    suppliers,
    products: [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    transactions: transactions.reverse(),
    users,
    orders: orders.reverse(),
    payments: payments.reverse(),
    carts,
  };
}

/** Write the sample dataset and product images. Existing files in those folders are replaced. */
export async function writeSampleData({ dataDir, uploadsDir, now } = {}) {
  const data = await buildSampleData(now);
  await fs.mkdir(dataDir, { recursive: true });
  for (const [name, rows] of Object.entries(data))
    await fs.writeFile(path.join(dataDir, `${name}.json`), JSON.stringify(rows, null, 2) + '\n', 'utf8');

  const imageDir = path.join(uploadsDir, 'products');
  await fs.rm(imageDir, { recursive: true, force: true });
  await fs.mkdir(imageDir, { recursive: true });
  for (const [i, row] of PRODUCTS.entries())
    await fs.writeFile(path.join(imageDir, `PRD-${pad(i + 1)}.svg`), productSvg(row[0], row[1], i), 'utf8');
  return data;
}
