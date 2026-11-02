import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-cine-border bg-cine-surface/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <p className="font-semibold text-white">PlanBDeal</p>
          <p className="mt-2 text-sm text-cine-muted">
            A peer-to-peer marketplace for unused movie tickets. We connect moviegoers — we never process payments
            or verify ticket transfers ourselves.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-white">Company</p>
          <ul className="space-y-1 text-sm text-cine-muted">
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/help" className="hover:text-white">Help</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-white">Legal</p>
          <ul className="space-y-1 text-sm text-cine-muted">
            <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-white">Safety</p>
          <p className="text-sm text-cine-muted">
            Only complete ticket transfers through your provider's permitted process. PlanBDeal never claims a
            screenshot or QR code is a valid transfer.
          </p>
        </div>
      </div>
      <div className="border-t border-cine-border py-4 text-center text-xs text-cine-muted">
        © {new Date().getFullYear()} PlanBDeal. A demo project — payments are not processed in this app.
      </div>
    </footer>
  );
}
