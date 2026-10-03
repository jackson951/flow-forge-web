import { Activity, GitBranch, Plug } from 'lucide-react';
import { Outlet } from 'react-router';
import { Logo } from '@/components/brand/logo';

/** Only what FlowForge actually does (backend release report, "Supported capabilities"). */
const HIGHLIGHTS = [
  {
    icon: Plug,
    title: 'Connect your tools',
    text: 'GitHub, Slack and Microsoft To Do, with tokens stored encrypted.',
  },
  {
    icon: GitBranch,
    title: 'Build small, clear workflows',
    text: 'A trigger, conditions and actions — including AI steps — on one canvas.',
  },
  {
    icon: Activity,
    title: 'See every step',
    text: 'Each run records what happened, step by step, and why anything failed.',
  },
];

/**
 * Login / register layout: the same navy brand rail and logo as the app's sidebar on the
 * left, the form in a card on the light canvas on the right. On small screens the logo sits
 * above the form.
 */
export function AuthLayout() {
  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="bg-sidebar relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-violet-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <Logo tagline className="relative" />
        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-semibold text-white">
            When something happens in one tool, make the next thing happen in another.
          </p>
          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="bg-sidebar-soft flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="text-primary-light size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="text-sidebar-text block text-sm">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sidebar-text relative text-xs">
          Event-driven workflow automation for developer teams.
        </p>
      </aside>

      <main className="bg-canvas flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo tone="dark" tagline className="mb-8 lg:hidden" />
          <div className="border-line bg-surface rounded-xl border p-8 shadow-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
