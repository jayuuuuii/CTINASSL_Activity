export default function PageBanner({ eyebrow, title, children }) {
  return (
    <section className="banner">
      <div className="container">
        {eyebrow && <p className="eyebrow eyebrow--light">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="banner__text">{children}</p>}
      </div>
    </section>
  );
}
