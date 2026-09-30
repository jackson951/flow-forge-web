import type { ReactNode } from 'react';

/** Standard padded, width-capped page body. Full-bleed screens (the editor) skip it. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 lg:px-8">{children}</div>;
}
