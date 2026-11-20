import { HardDrive, ListChecks, Compass } from 'lucide-react';
import PageBanner from '../../components/PageBanner.jsx';
import CallToAction from '../../components/CallToAction.jsx';

const POINTS = [
  {
    icon: ListChecks,
    title: 'Made for small teams',
    text: 'No training required. If you can fill in a form and read a table, you can run your inventory here.',
  },
  {
    icon: HardDrive,
    title: 'One source of truth',
    text: 'The shop and our stockroom run on the same records. When you order, the count on the shelf drops at that moment, so we never sell what we do not have.',
  },
  {
    icon: Compass,
    title: 'Clear by design',
    text: 'Three stock states, one reorder level per product and honest numbers. Nothing is hidden behind jargon.',
  },
];

export default function About() {
  return (
    <>
      <PageBanner eyebrow="About" title="About Shelfwork">
        A modest inventory tool with the feel of a well-run shop.
      </PageBanner>

      <section className="section">
        <div className="container about">
          <div className="about__copy">
            <p className="eyebrow">Our approach</p>
            <h2>Counting should not be the hardest part of the job</h2>
            <p>
              Shelfwork began with a simple idea: most small businesses do not need a heavy enterprise system. They
              need a dependable list of what they sell, how many are left and when to order more.
            </p>
            <p>
              Every product carries a reorder level. When the count reaches it, the item is marked low. When it
              reaches zero, it is marked out of stock. That is the whole idea, and it is surprisingly effective.
            </p>
            <p>
              The same numbers now power our online shop. Every product page shows the live count, and every order
              you place is taken straight off the shelf, so what you buy is what we ship.
            </p>
          </div>

          <div className="about__points">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <div className="point" key={title}>
                <Icon size={40} strokeWidth={1} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CallToAction title="See what is on the shelf today" text="Browse the shop and order for delivery, cash on delivery available." cta="Shop now" href="#/shop" />
    </>
  );
}
