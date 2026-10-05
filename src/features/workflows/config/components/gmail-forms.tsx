import { Info, Settings, Tag, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { Field, Input } from '@/components/ui';
import { useGmailLabels } from '@/features/integrations/api/integrations.api';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { useConfigScope } from '../config-scope';
import type { FormProps } from './node-forms';
import { ConnectionSelect } from './connection-select';
import { ResourcePicker } from './resource-picker';
import { TemplateInput } from './template-input';

const str = (value: unknown) => (typeof value === 'string' ? value : '');
type GmailProps = FormProps & { type: string };

export function GmailForm(props: GmailProps) {
  if (props.type === 'gmail.email.received' || props.type === 'gmail.email.labelReceived')
    return <GmailTriggerForm {...props} />;
  switch (props.type) {
    case 'gmail.sendEmail':
      return <SendEmailForm {...props} />;
    case 'gmail.replyToEmail':
      return <ReplyEmailForm {...props} />;
    case 'gmail.getEmail':
      return <MessageActionForm {...props} />;
    case 'gmail.addLabel':
    case 'gmail.removeLabel':
      return <LabelActionForm {...props} />;
    case 'gmail.markAsRead':
    case 'gmail.markAsUnread':
      return <MessageActionForm {...props} />;
    default:
      return null;
  }
}

function GmailFoundation({
  config,
  setMany,
  error,
  children,
}: FormProps & { children: React.ReactNode }) {
  const connectionId = str(config.connectionId) || undefined;
  return (
    <>
      <Field id="cfg-connection" label="Gmail connection" error={error('connectionId')}>
        <ConnectionSelect
          id="cfg-connection"
          provider="GMAIL"
          value={connectionId}
          invalid={!!error('connectionId')}
          onChange={(id) => setMany({ connectionId: id, labelId: undefined }, 'connectionId')}
        />
      </Field>
      {children}
    </>
  );
}

function GmailTriggerForm(props: GmailProps) {
  const { config, set, error, type } = props;
  const { readOnly } = useConfigScope();
  const filter = (config.filter as Record<string, unknown> | undefined) ?? {};
  const setFilter = (field: string, value: string) => {
    const next = { ...filter, [field]: value || undefined };
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
    set('filter', Object.keys(next).length ? next : undefined);
  };
  return (
    <GmailFoundation {...props}>
      {type === 'gmail.email.labelReceived' && <GmailLabelPicker {...props} />}
      <Checkbox
        id="cfg-include-sent"
        checked={config.includeSentByMe === true}
        onChange={(checked) => set('includeSentByMe', checked ? true : undefined)}
        label="Include email sent by this mailbox"
      />
      <Notice warning>
        Leave this off to prevent loops when a workflow sends mail from the same mailbox.
      </Notice>
      <Field id="cfg-filter-from" label="From contains (optional)" error={error('filter.from')}>
        <Input
          id="cfg-filter-from"
          value={str(filter.from)}
          maxLength={200}
          disabled={readOnly}
          onChange={(event) => setFilter('from', event.target.value)}
          placeholder="customer@example.com"
        />
      </Field>
      <Field
        id="cfg-filter-subject"
        label="Subject contains (optional)"
        error={error('filter.subjectContains')}
      >
        <Input
          id="cfg-filter-subject"
          value={str(filter.subjectContains)}
          maxLength={200}
          disabled={readOnly}
          onChange={(event) => setFilter('subjectContains', event.target.value)}
          placeholder="Support request"
        />
      </Field>
      <Notice>
        After publishing, FlowForge watches this mailbox through Google push notifications and
        renews the watch automatically.
      </Notice>
    </GmailFoundation>
  );
}

function SendEmailForm(props: GmailProps) {
  return (
    <GmailFoundation {...props}>
      <TemplateField
        {...props}
        field="to"
        label="To"
        maxLength={4_000}
        hint="Separate several addresses with commas."
      />
      <TemplateField {...props} field="cc" label="Cc (optional)" maxLength={4_000} />
      <TemplateField {...props} field="bcc" label="Bcc (optional)" maxLength={4_000} />
      <TemplateField {...props} field="replyTo" label="Reply-to (optional)" maxLength={1_000} />
      <TemplateField {...props} field="subject" label="Subject" maxLength={998} />
      <TemplateField
        {...props}
        field="text"
        label="Plain-text body"
        maxLength={100_000}
        multiline
      />
      <TemplateField
        {...props}
        field="html"
        label="HTML body (optional)"
        maxLength={200_000}
        multiline
      />
      <Notice warning>
        A daily send limit applies per workspace. If Gmail may have accepted a send before an error,
        FlowForge marks the outcome uncertain and does not retry it automatically.
      </Notice>
    </GmailFoundation>
  );
}

function ReplyEmailForm(props: GmailProps) {
  const { config, setMany } = props;
  const { readOnly } = useConfigScope();
  useEffect(() => {
    if (!readOnly && !config.messageId)
      setMany({ messageId: '{{ trigger.messageId }}' }, 'messageId');
  }, [config.messageId, readOnly, setMany]);
  return (
    <GmailFoundation {...props}>
      <MessageIdField {...props} />
      <TemplateField
        {...props}
        field="text"
        label="Plain-text reply"
        maxLength={100_000}
        multiline
      />
      <TemplateField
        {...props}
        field="html"
        label="HTML reply (optional)"
        maxLength={200_000}
        multiline
      />
      <Checkbox
        id="cfg-reply-all"
        checked={config.replyAll === true}
        onChange={(checked) => props.set('replyAll', checked ? true : undefined)}
        label="Reply to everyone"
      />
      <Notice>
        The reply stays in the same thread. Reply all never adds the connected mailbox itself.
      </Notice>
    </GmailFoundation>
  );
}

function MessageActionForm(props: GmailProps) {
  return (
    <GmailFoundation {...props}>
      <MessageIdField {...props} />
    </GmailFoundation>
  );
}

function LabelActionForm(props: GmailProps) {
  return (
    <GmailFoundation {...props}>
      <MessageIdField {...props} />
      <GmailLabelPicker {...props} />
    </GmailFoundation>
  );
}

function GmailLabelPicker(props: FormProps) {
  const workspace = useWorkspace();
  const connectionId = str(props.config.connectionId) || undefined;
  const labels = useGmailLabels(workspace.id, connectionId);
  return (
    <Field id="cfg-label" label="Gmail label" error={props.error('labelId')}>
      <ResourcePicker
        id="cfg-label"
        label="Gmail labels"
        waitingText={connectionId ? undefined : 'Choose a connection first.'}
        items={labels.data?.map((label) => ({
          id: label.id,
          label: label.name,
          detail: label.type === 'system' ? 'System' : 'User',
          icon: label.type === 'system' ? Settings : Tag,
        }))}
        value={str(props.config.labelId) || undefined}
        onChange={(value) => props.set('labelId', value)}
        isLoading={labels.isLoading}
        error={labels.error}
        onRetry={() => void labels.refetch()}
        emptyText="This mailbox has no labels."
        invalid={!!props.error('labelId')}
      />
    </Field>
  );
}

function MessageIdField(props: FormProps) {
  return (
    <TemplateField
      {...props}
      field="messageId"
      label="Message id"
      maxLength={200}
      hint={
        str(props.config.messageId).includes('{{')
          ? 'Resolved at run time.'
          : 'The Gmail message id.'
      }
    />
  );
}

function TemplateField({
  config,
  set,
  touch,
  error,
  field,
  label,
  maxLength,
  multiline,
  hint,
}: FormProps & {
  field: string;
  label: string;
  maxLength: number;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <Field id={`cfg-${field}`} label={label} error={error(field)} hint={hint}>
      <TemplateInput
        id={`cfg-${field}`}
        value={str(config[field])}
        onChange={(value) => set(field, value || undefined)}
        onBlur={() => touch(field)}
        maxLength={maxLength}
        multiline={multiline}
        invalid={!!error(field)}
      />
    </Field>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const { readOnly } = useConfigScope();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}

function Notice({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  const Icon = warning ? TriangleAlert : Info;
  return (
    <div
      className={
        warning
          ? 'flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950'
          : 'bg-canvas text-muted flex items-start gap-2 rounded-lg px-3 py-2 text-sm'
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
