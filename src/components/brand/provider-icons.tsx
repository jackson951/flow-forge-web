import { Globe, Webhook } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { IntegrationProviderKey } from '@/types/api';

type IconProps = { className?: string };

/** GitHub mark (Octicons "mark-github"). Uses currentColor so it adapts to its background. */
export function GitHubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('size-5', className)} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Slack mark in its four brand colours. */
export function SlackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 122.8 122.8" aria-hidden className={cn('size-5', className)}>
      <path
        fill="#E01E5A"
        d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9Zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6Z"
      />
      <path
        fill="#36C5F0"
        d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2Zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3Z"
      />
      <path
        fill="#2EB67D"
        d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2Zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3Z"
      />
      <path
        fill="#ECB22E"
        d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9Zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6Z"
      />
    </svg>
  );
}

/** Microsoft four-square logo. */
export function MicrosoftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 23 23" aria-hidden className={cn('size-5', className)}>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

/** Jira mark (Atlassian blue). */
export function JiraIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5', className)} fill="#0052CC">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005Zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001ZM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" />
    </svg>
  );
}

/** Gmail "M" mark in its brand colours. */
export function GmailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5', className)}>
      <path
        fill="#4285F4"
        d="M1.636 21.002h3.819v-9.273L0 7.638v11.728c0 .904.732 1.636 1.636 1.636Z"
      />
      <path
        fill="#34A853"
        d="M18.545 21.002h3.819c.904 0 1.636-.732 1.636-1.636V7.638l-5.455 4.091Z"
      />
      <path
        fill="#FBBC04"
        d="M18.545 4.638v7.091L24 7.638V5.457c0-2.023-2.309-3.178-3.927-1.964Z"
      />
      <path fill="#EA4335" d="M5.455 11.729V4.638L12 9.548l6.545-4.91v7.091L12 16.639Z" />
      <path
        fill="#C5221F"
        d="M0 5.457v2.181l5.455 4.091V4.638L3.927 3.493C2.309 2.279 0 3.434 0 5.457Z"
      />
    </svg>
  );
}

/** Generic HTTP connections and requests (no brand). */
export function HttpIcon({ className }: IconProps) {
  return <Globe aria-hidden className={cn('size-5 text-sky-600', className)} />;
}

/** Generic inbound webhooks (no brand). */
export function WebhookIcon({ className }: IconProps) {
  return <Webhook aria-hidden className={cn('size-5 text-violet-600', className)} />;
}

/** Anthropic "A" mark (AI steps run on Claude). Uses currentColor. */
export function AnthropicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5', className)} fill="currentColor">
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<IntegrationProviderKey, (p: IconProps) => React.JSX.Element> = {
  GITHUB: GitHubIcon,
  SLACK: SlackIcon,
  MICROSOFT: MicrosoftIcon,
  JIRA: JiraIcon,
  GMAIL: GmailIcon,
  HTTP: HttpIcon,
  WEBHOOK: WebhookIcon,
};

/** The provider's logo; decorative — pair it with the provider name in text. */
export function ProviderIcon({
  provider,
  className,
}: {
  provider: IntegrationProviderKey;
  className?: string;
}) {
  const Icon = PROVIDER_ICONS[provider];
  return <Icon className={className} />;
}
