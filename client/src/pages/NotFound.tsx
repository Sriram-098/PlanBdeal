import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-4xl font-bold text-white">404</h1>
      <p className="text-cine-muted">We couldn&apos;t find the page you were looking for.</p>
      <Link to="/" className="text-cine-accent hover:underline">
        Back to home
      </Link>
    </div>
  );
}
