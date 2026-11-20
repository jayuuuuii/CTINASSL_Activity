import { useEffect } from 'react';
import { navigate } from '../hooks/useHashRoute.js';

/** Change the route after render (navigating during render is a React anti-pattern). */
export default function Redirect({ to }) {
  useEffect(() => {
    navigate(to);
  }, [to]);
  return null;
}
