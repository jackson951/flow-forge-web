import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-start justify-center gap-4 p-10">
      <h1 className="text-2xl font-semibold">This page doesn’t exist</h1>
      <p className="text-muted text-sm">Check the address, or head back to your dashboard.</p>
      <Link to="/" className={buttonClasses()}>
        Go to dashboard
      </Link>
    </div>
  );
}
