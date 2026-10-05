import {
  Activity,
  ArrowDown,
  ArrowRight,
  Building2,
  CircleCheckBig,
  Code2,
  History,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { ProviderIcon } from '@/components/brand/provider-icons';
import { buttonClasses } from '@/components/ui';
import { paths } from '@/lib/routes';

/** Example flow, made only of step types FlowForge really has. */
const FLOW: { type: string; title: string; detail: string }[] = [
  { type: 'github.issue.created', title: 'GitHub issue opened', detail: 'acme/api' },
  { type: 'ai.classify', title: 'AI: classify text', detail: 'HIGH · MEDIUM · LOW' },
  { type: 'condition', title: 'Condition', detail: 'label equals HIGH' },
  { type: 'slack.sendMessage', title: 'Slack: send message', detail: '#incidents' },
];

const USE_CASES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Code2,
    title: 'Engineering',
    text: 'Triage new GitHub issues: classify them and alert the right Slack channel for the urgent ones.',
  },
  {
    icon: Building2,
    title: 'Operations',
    text: 'Receive a webhook or poll an API, then create a Jira issue or Microsoft To Do task with the details filled in.',
  },
  {
    icon: Webhook,
    title: 'Email workflows',
    text: 'Start from new Gmail messages, classify or extract their plain-text content, then reply or organise the mailbox.',
  },
  {
    icon: Sparkles,
    title: 'AI automation',
    text: 'Summarise, classify and extract fields from text inside a workflow, then act on the result.',
  },
];

const RELIABILITY: { icon: LucideIcon; text: string }[] = [
  { icon: Layers, text: 'Queued execution' },
  { icon: RefreshCw, text: 'Automatic retries' },
  { icon: History, text: 'Step-by-step run history' },
  { icon: KeyRound, text: 'Encrypted credentials' },
  { icon: ScrollText, text: 'Audit log' },
  { icon: Lock, text: 'Workspace isolation' },
  { icon: Webhook, text: 'Verified webhooks' },
  { icon: Activity, text: 'Live, observable runs' },
];

/** Public homepage for signed-out visitors (Part 12): what FlowForge does and for whom. */
export function HomePage() {
  return (
    <>
      <section className="from-primary-soft/60 bg-gradient-to-b to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            Automation built for real work
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Connect your tools. Build workflows. Automate the work between them.
          </h1>
          <p className="text-muted mx-auto mt-5 max-w-2xl text-lg">
            FlowForge connects the applications your team already uses and turns repetitive
            processes into reliable workflows you can watch, step by step.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={paths.register} className={buttonClasses('primary', 'md')}>
              Start building free
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link to={paths.publicIntegrations} className={buttonClasses('secondary', 'md')}>
              Explore integrations
            </Link>
          </div>
          <div
            className="text-muted mt-6 flex flex-wrap items-center justify-center gap-2 text-sm"
            role="img"
            aria-label="Example: GitHub, then AI, then a condition, then Slack"
          >
            {FLOW.map((step, i) => (
              <span key={step.type} className="inline-flex items-center gap-2">
                <NodeTypeIcon type={step.type} size="sm" />
                {i < FLOW.length - 1 && <ArrowRight className="size-4" aria-hidden />}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="build" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              Build visually
            </p>
            <h2 id="build" className="mt-2 text-3xl font-bold tracking-tight">
              A trigger, conditions and actions — on one canvas
            </h2>
            <p className="text-muted mt-4">
              Drag steps onto the canvas, connect them, and map data from earlier steps with
              <code className="mx-1 font-mono text-sm">{'{{ references }}'}</code>. Conditions send
              each run down a true or false branch. Publish when it is ready; every version is kept.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                'Triggers: schedules, webhooks, API polling, GitHub, Jira, Gmail, or manual runs',
                'Actions: HTTP, Jira, Gmail, Slack, Microsoft To Do, and logs',
                'AI steps: summarise, classify, extract',
                'Conditions with AND / OR / NOT',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CircleCheckBig className="text-status-succeeded size-4" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <ol
            aria-label="Example workflow"
            className="border-line bg-canvas mx-auto w-full max-w-sm space-y-2 rounded-2xl border p-6"
          >
            {FLOW.map((step, i) => (
              <li key={step.type}>
                <div className="border-line bg-surface flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm">
                  <NodeTypeIcon type={step.type} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{step.title}</span>
                    <span className="text-muted block font-mono text-xs">{step.detail}</span>
                  </span>
                </div>
                {i < FLOW.length - 1 && (
                  <div
                    className="text-muted flex items-center justify-center gap-1 py-1 text-xs"
                    aria-hidden
                  >
                    <ArrowDown className="size-4" />
                    {step.type === 'condition' && (
                      <span className="text-status-succeeded font-semibold">true</span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="integrations" className="bg-canvas border-line border-y">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            Integrations
          </p>
          <h2 id="integrations" className="mt-2 text-3xl font-bold tracking-tight">
            Works with the tools you use
          </h2>
          <ul className="mt-8 flex flex-wrap justify-center gap-4">
            {(
              [
                ['GITHUB', 'GitHub'],
                ['SLACK', 'Slack'],
                ['MICROSOFT', 'Microsoft To Do'],
                ['JIRA', 'Jira'],
                ['GMAIL', 'Gmail'],
                ['HTTP', 'HTTP connections'],
              ] as const
            ).map(([key, name]) => (
              <li
                key={key}
                className="border-line bg-surface flex items-center gap-3 rounded-xl border px-5 py-3 shadow-sm"
              >
                <ProviderIcon provider={key} className="size-6" />
                <span className="font-medium">{name}</span>
              </li>
            ))}
            <li className="border-line bg-surface flex items-center gap-3 rounded-xl border px-5 py-3 shadow-sm">
              <NodeTypeIcon type="ai.summarize" size="sm" />
              <span className="font-medium">AI steps</span>
            </li>
          </ul>
          <Link
            to={paths.publicIntegrations}
            className="text-primary mt-6 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            What each integration does
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section aria-labelledby="use-cases" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="use-cases" className="text-center text-3xl font-bold tracking-tight">
          Built for real work
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u) => (
            <li key={u.title} className="border-line rounded-2xl border p-6">
              <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-lg">
                <u.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{u.title}</h3>
              <p className="text-muted mt-2 text-sm">{u.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="reliable" className="bg-sidebar text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="reliable" className="text-center text-3xl font-bold tracking-tight">
            Reliable by design
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {RELIABILITY.map((r) => (
              <li key={r.text} className="flex items-center gap-2 text-sm">
                <r.icon className="size-4 shrink-0 text-sky-300" aria-hidden />
                {r.text}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center">
            <Link
              to={paths.security}
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-300 hover:underline"
            >
              <ShieldCheck className="size-4" aria-hidden />
              How FlowForge keeps your data safe
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Stop moving data between tools by hand.
        </h2>
        <Link to={paths.register} className={`${buttonClasses('primary', 'md')} mt-6`}>
          Create your workspace
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </>
  );
}
