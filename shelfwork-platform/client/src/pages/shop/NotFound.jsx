import { Compass } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';

export default function NotFound() {
  return (
    <div className="container section">
      <EmptyState icon={Compass} title="Page not found" action={<a className="btn btn--primary" href="#/home">Go home</a>}>
        The link may be old or mistyped.
      </EmptyState>
    </div>
  );
}
