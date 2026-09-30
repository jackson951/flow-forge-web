import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="bg-ink hidden flex-col justify-between p-10 text-white lg:flex">
        <span className="text-lg font-semibold">
          Flow<span className="text-ember">Forge</span>
        </span>
        <p className="max-w-sm text-2xl leading-snug font-medium">
          When something happens in one tool, make the next thing happen in another — and see every
          step it took.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
