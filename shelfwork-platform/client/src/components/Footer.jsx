import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__about">
          <Logo tone="light" />
          <p>
            Everyday goods for homes, offices and small shops, sold straight from our stockroom.
            Every product shows its real stock count, so what you see is what we can ship.
          </p>
        </div>

        <nav className="footer__nav" aria-label="Shop">
          <h4>Shop</h4>
          <a href="#/shop">All products</a>
          <a href="#/categories">Categories</a>
          <a href="#/shop?sort=newest">New arrivals</a>
          <a href="#/cart">Cart</a>
        </nav>

        <nav className="footer__nav" aria-label="Account">
          <h4>Account</h4>
          <a href="#/account">My account</a>
          <a href="#/account">Order history</a>
          <a href="#/about">About us</a>
          <a href="#/admin">Staff login</a>
        </nav>
      </div>
      <div className="footer__bar">
        <div className="container">
          © {new Date().getFullYear()} Shelfwork Inventory Co. · A school project: payments are simulated and no card details are collected.
        </div>
      </div>
    </footer>
  );
}
