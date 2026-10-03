import {
  ArrowRight,
  Braces,
  Eye,
  GitBranch,
  History,
  KeyRound,
  Lock,
  MousePointerClick,
  Play,
  RefreshCw,
  Rocket,
  ScrollText,
  ShieldCheck,
  Split,
  Timer,
  Undo2,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { ProviderIcon } from '@/components/brand/provider-icons';
import { buttonClasses } from '@/components/ui';
import { PROVIDER_CATALOG } from '@/features/integrations/provider-catalog';
import { paths } from '@/lib/routes';

function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="from-primary-soft/60 bg-gradient-to-b to-transparent">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
        <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted mx-auto mt-4 max-w-2xl text-lg">{children}</p>
      </div>
    </section>
  );
}

function Grid({ items }: { items: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <li key={f.title} className="border-line rounded-2xl border p-6">
          <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-lg">
            <f.icon className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 font-semibold">{f.title}</h2>
          <p className="text-muted mt-2 text-sm">{f.text}</p>
        </li>
      ))}
    </ul>
  );
}

function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 text-center sm:px-6">
      <Link to={paths.register} className={buttonClasses('primary', 'md')}>
        Start building free
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

/** Product capabilities (public). Only what the product does today. */
export function FeaturesPage() {
  return (
    <>
      <PageIntro eyebrow="Product" title="Everything you need to automate a process">
        Build the workflow, publish it, and watch every run — with the safety rails that make
        automation trustworthy.
      </PageIntro>
      <Grid
        items={[
          {
            icon: MousePointerClick,
            title: 'Visual editor',
            text: 'Drag steps onto a canvas and connect them. Or use the keyboard: every connection can be made from menus.',
          },
          {
            icon: Split,
            title: 'Conditions',
            text: 'Send each run down a true or false branch with AND / OR / NOT rules on data from earlier steps.',
          },
          {
            icon: Braces,
            title: 'Data mapping',
            text: 'Use {{ references }} to pass the issue title, an AI label or any earlier output into the next step.',
          },
          {
            icon: Rocket,
            title: 'Drafts and versions',
            text: 'Edits autosave as a draft. Publishing makes an immutable version; restore an older one any time.',
          },
          {
            icon: Play,
            title: 'Run now',
            text: 'Start a run by hand with your own input, or let a trigger start it. A double click still makes one run.',
          },
          {
            icon: Eye,
            title: 'Every step visible',
            text: 'See the path each run took, every step’s input and output, how long it took and why anything failed.',
          },
          {
            icon: RefreshCw,
            title: 'Retries that are safe',
            text: 'Retry from the start or resume from the failed step. If a step may already have acted, FlowForge asks first.',
          },
          {
            icon: Users,
            title: 'Workspaces and roles',
            text: 'Invite your team. Owners, admins and members each see and do what their role allows.',
          },
          {
            icon: Undo2,
            title: 'Undo everything',
            text: 'Every edit on the canvas can be undone and redone; leaving with unsaved changes asks first.',
          },
        ]}
      />
      <Cta />
    </>
  );
}

/** Integration catalogue (public). */
export function PublicIntegrationsPage() {
  return (
    <>
      <PageIntro eyebrow="Integrations" title="Connect the tools your team already uses">
        A workspace connects each account once; everyone building workflows in it can use the
        connection without ever seeing its credentials.
      </PageIntro>
      <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2">
        {PROVIDER_CATALOG.map((p) => (
          <li key={p.key} className="border-line rounded-2xl border p-6">
            <div className="flex items-center gap-3">
              <span className="border-line flex size-12 items-center justify-center rounded-xl border">
                <ProviderIcon provider={p.key} className="size-7" />
              </span>
              <h2 className="text-lg font-semibold">{p.name}</h2>
            </div>
            <p className="text-muted mt-3 text-sm">{p.summary}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {p.trigger && (
                <li className="bg-primary-soft text-primary rounded-full px-2 py-0.5 font-medium">
                  Trigger: {p.trigger}
                </li>
              )}
              {p.actions.map((a) => (
                <li key={a} className="bg-canvas rounded-full px-2 py-0.5 font-medium">
                  Action: {a}
                </li>
              ))}
            </ul>
          </li>
        ))}
        <li className="border-line rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <NodeTypeIcon type="ai.summarize" />
            <h2 className="text-lg font-semibold">AI steps</h2>
          </div>
          <p className="text-muted mt-3 text-sm">
            Summarise text, classify it into your own labels, or extract structured fields — then
            use the result in conditions and later steps.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {['Summarise', 'Classify', 'Extract fields'].map((a) => (
              <li key={a} className="bg-canvas rounded-full px-2 py-0.5 font-medium">
                Action: {a}
              </li>
            ))}
          </ul>
        </li>
        <li className="border-line rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <NodeTypeIcon type="manual.trigger" />
            <h2 className="text-lg font-semibold">Built in</h2>
          </div>
          <p className="text-muted mt-3 text-sm">
            Start runs by hand with JSON input, branch with conditions, and write messages to the
            run history.
          </p>
        </li>
      </ul>
      <Cta />
    </>
  );
}

/** Security and reliability (public). */
export function SecurityPage() {
  return (
    <>
      <PageIntro eyebrow="Security" title="Built to be trusted with your tools">
        How FlowForge protects your accounts, isolates workspaces and keeps automation predictable.
      </PageIntro>
      <Grid
        items={[
          {
            icon: KeyRound,
            title: 'Encrypted credentials',
            text: 'Provider tokens are encrypted at rest and never returned by the API or shown in the app. Workflows refer to a connection, never to a secret.',
          },
          {
            icon: Lock,
            title: 'Workspace isolation',
            text: 'Every request is checked against your workspace membership. Another workspace’s data behaves as if it does not exist.',
          },
          {
            icon: Users,
            title: 'Roles',
            text: 'Owners, admins and members. Connecting integrations, publishing and retrying runs are for admins and owners.',
          },
          {
            icon: ShieldCheck,
            title: 'Sessions',
            text: 'Short-lived access tokens kept in memory and a refresh cookie the browser scripts cannot read. Sign out of every device at once.',
          },
          {
            icon: Webhook,
            title: 'Verified webhooks',
            text: 'Incoming events are signature-checked and de-duplicated before a run starts.',
          },
          {
            icon: ScrollText,
            title: 'Audit log',
            text: 'Changes to members, connections, publishing and runs are recorded with who did them.',
          },
          {
            icon: Timer,
            title: 'Rate limits and back-pressure',
            text: 'Limits protect the service from overload; when it is busy, FlowForge says when to try again.',
          },
          {
            icon: History,
            title: 'Honest run history',
            text: 'If a step may already have acted when something failed, the run says so and a retry asks you to confirm.',
          },
          {
            icon: GitBranch,
            title: 'Immutable versions',
            text: 'Published versions never change, so a run always shows exactly what was executed.',
          },
        ]}
      />
      <Cta />
    </>
  );
}
