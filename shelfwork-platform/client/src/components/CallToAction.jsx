import { ArrowRight } from 'lucide-react';

export default function CallToAction({ title, text, cta, href }) {
  return (
    <section className="cta">
      <div className="container cta__inner">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <a href={href} className="btn btn--cream btn--lg">
          {cta} <ArrowRight size={18} strokeWidth={1.5} />
        </a>
      </div>
    </section>
  );
}
