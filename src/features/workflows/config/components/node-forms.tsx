import {
  BookMarked,
  CalendarDays,
  Hash,
  Hourglass,
  Info,
  ListTodo,
  Lock,
  Megaphone,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import {
  useGitHubRepositories,
  useSlackChannels,
  useTodoLists,
} from '@/features/integrations/api/integrations.api';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { cn } from '@/lib/cn';
import { useConfigScope } from '../config-scope';
import { asCondition } from '../condition-model';
import { LIMITS, type ConditionGroup } from '../schemas';
import { upcomingFormPart } from '../upcoming-forms';
import { ConditionBuilder } from './condition-builder';
import { ConnectionSelect } from './connection-select';
import { ReferenceInput } from './reference-input';
import { ResourcePicker } from './resource-picker';
import { ScheduleTriggerForm } from './schedule-trigger-form';
import { TemplateInput } from './template-input';

export interface FormProps {
  config: Record<string, unknown>;
  /** Sets one top-level field (undefined removes it). */
  set: (field: string, value: unknown) => void;
  /** Sets several top-level fields in one edit (undefined removes a field). */
  setMany: (patch: Record<string, unknown>, field: string) => void;
  /** Replaces the whole config (conditions). */
  replace: (config: Record<string, unknown>, field: string) => void;
  /**
   * Message to show on a field: client validation or the server's issue for that path (or,
   * unless `exact`, for anything below it).
   */
  error: (path: string, exact?: boolean) => string | undefined;
  /** Validation messages by path (condition builder). */
  errors: Record<string, string>;
  touch: (field: string) => void;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** The settings form for a node type (Part 06, FR-06.2). */
export function NodeForm({ type, ...props }: FormProps & { type: string }) {
  switch (type) {
    case 'manual.trigger':
      return <ManualTriggerForm />;
    case 'schedule.trigger':
      return <ScheduleTriggerForm {...props} />;
    case 'github.issue.created':
      return <GitHubTriggerForm {...props} />;
    case 'condition':
      return <ConditionForm {...props} />;
    case 'util.log':
      return <LogForm {...props} />;
    case 'slack.sendMessage':
      return <SlackForm {...props} />;
    case 'microsoft.todo.createTask':
      return <TodoForm {...props} />;
    case 'ai.summarize':
      return <SummarizeForm {...props} />;
    case 'ai.classify':
      return <ClassifyForm {...props} />;
    case 'ai.extract':
      return <ExtractForm {...props} />;
    default:
      return <PendingForm type={type} />;
  }
}

/** No form yet: say so, and leave the step's existing settings untouched. */
function PendingForm({ type }: { type: string }) {
  const part = upcomingFormPart(type);
  return (
    <Note icon={<Hourglass className="size-4" aria-hidden />}>
      {part
        ? `The settings form for this step arrives in frontend Part ${part}.`
        : 'There is no settings form for this step type in this version of the app.'}{' '}
      Its current settings are kept as they are when you save.
    </Note>
  );
}

function Note({
  icon,
  children,
  tone = 'info',
}: {
  icon: ReactNode;
  children: ReactNode;
  tone?: 'info' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
        tone === 'info' ? 'bg-canvas text-muted' : 'bg-amber-50 text-amber-900',
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function ManualTriggerForm() {
  return (
    <Note icon={<Info className="size-4" aria-hidden />}>
      No settings. Runs start from FlowForge with optional JSON input; later steps can use its
      fields as <code className="font-mono text-xs">{'{{ trigger.<field> }}'}</code>.
    </Note>
  );
}

function GitHubTriggerForm({ config, set, setMany, error }: FormProps) {
  const workspace = useWorkspace();
  const connectionId = str(config.connectionId) || undefined;
  const repos = useGitHubRepositories(workspace.id, connectionId);
  return (
    <>
      <Field id="cfg-connection" label="GitHub connection" error={error('connectionId')}>
        <ConnectionSelect
          id="cfg-connection"
          provider="GITHUB"
          value={connectionId}
          invalid={!!error('connectionId')}
          onChange={(id) => {
            // Resources belong to the connection: choosing another clears the old one.
            setMany({ connectionId: id, repository: undefined }, 'connectionId');
          }}
        />
      </Field>
      <Field id="cfg-repository" label="Repository" error={error('repository')}>
        <ResourcePicker
          id="cfg-repository"
          label="Repositories"
          waitingText={connectionId ? undefined : 'Choose a connection first.'}
          items={repos.data?.map((r) => ({
            id: r.fullName,
            label: r.fullName,
            icon: r.private ? Lock : BookMarked,
            detail: r.private ? 'Private' : undefined,
          }))}
          value={str(config.repository) || undefined}
          onChange={(v) => set('repository', v)}
          isLoading={repos.isLoading}
          error={repos.error}
          onRetry={() => void repos.refetch()}
          emptyText="The GitHub App cannot see any repositories. Add repositories to the installation on GitHub."
          invalid={!!error('repository')}
        />
      </Field>
      <Note icon={<Info className="size-4" aria-hidden />}>
        Starts when an issue is opened in this repository. Later steps can use{' '}
        <code className="font-mono text-xs">{'{{ trigger.issue.title }}'}</code> and more.
      </Note>
    </>
  );
}

function ConditionForm({ config, replace, errors }: FormProps) {
  return (
    <ConditionBuilder
      value={asCondition(config)}
      onChange={(next: ConditionGroup, field) => replace(next as Record<string, unknown>, field)}
      errors={errors}
    />
  );
}

function LogForm({ config, set, error, touch }: FormProps) {
  return (
    <Field
      id="cfg-message"
      label="Message"
      error={error('message')}
      hint="Written to the run history."
    >
      <TemplateInput
        id="cfg-message"
        multiline
        value={str(config.message)}
        onChange={(v) => set('message', v)}
        onBlur={() => touch('message')}
        maxLength={LIMITS.logMessage}
        invalid={!!error('message')}
        placeholder="New issue: {{ trigger.issue.title }}"
      />
    </Field>
  );
}

function SlackForm({ config, set, setMany, error, touch }: FormProps) {
  const workspace = useWorkspace();
  const connectionId = str(config.connectionId) || undefined;
  const channels = useSlackChannels(workspace.id, connectionId);
  const broadcast = config.allowBroadcastMentions === true;
  return (
    <>
      <Field id="cfg-connection" label="Slack connection" error={error('connectionId')}>
        <ConnectionSelect
          id="cfg-connection"
          provider="SLACK"
          value={connectionId}
          invalid={!!error('connectionId')}
          onChange={(id) => {
            // Resources belong to the connection: choosing another clears the old one.
            setMany({ connectionId: id, channelId: undefined }, 'connectionId');
          }}
        />
      </Field>
      <Field
        id="cfg-channel"
        label="Channel"
        error={error('channelId')}
        hint="Private channels appear once the FlowForge bot is invited to them."
      >
        <ResourcePicker
          id="cfg-channel"
          label="Channels"
          waitingText={connectionId ? undefined : 'Choose a connection first.'}
          items={channels.data?.pages.flatMap((p) =>
            p.items.map((c) => ({
              id: c.id,
              label: c.name,
              icon: c.isPrivate ? Lock : Hash,
              detail: c.isPrivate ? 'Private' : undefined,
            })),
          )}
          value={str(config.channelId) || undefined}
          onChange={(v) => set('channelId', v)}
          isLoading={channels.isLoading}
          error={channels.error}
          onRetry={() => void channels.refetch()}
          hasMore={channels.hasNextPage}
          loadingMore={channels.isFetchingNextPage}
          onLoadMore={() => void channels.fetchNextPage()}
          emptyText="The bot cannot post to any channel yet. Invite it to a channel in Slack."
          invalid={!!error('channelId')}
        />
      </Field>
      <Field id="cfg-text" label="Message" error={error('text')}>
        <TemplateInput
          id="cfg-text"
          multiline
          value={str(config.text)}
          onChange={(v) => set('text', v)}
          onBlur={() => touch('text')}
          maxLength={LIMITS.slackText}
          invalid={!!error('text')}
          placeholder="High priority issue: {{ trigger.issue.title }} {{ trigger.issue.url }}"
        />
      </Field>
      <CheckboxRow
        id="cfg-broadcast"
        checked={broadcast}
        onChange={(on) => set('allowBroadcastMentions', on ? true : undefined)}
        icon={<Megaphone className="text-muted size-4" aria-hidden />}
        label="Allow @channel, @here and @everyone"
      />
      {broadcast && (
        <Note tone="warning" icon={<TriangleAlert className="size-4" aria-hidden />}>
          These mentions notify everyone in the channel, every time this step runs. Leave this off
          unless the message really needs it.
        </Note>
      )}
    </>
  );
}

function TodoForm({ config, set, setMany, error, touch }: FormProps) {
  const workspace = useWorkspace();
  const { readOnly } = useConfigScope();
  const connectionId = str(config.connectionId) || undefined;
  const lists = useTodoLists(workspace.id, connectionId);
  const optional = (field: string) => (v: string) => set(field, v === '' ? undefined : v);
  return (
    <>
      <Field id="cfg-connection" label="Microsoft connection" error={error('connectionId')}>
        <ConnectionSelect
          id="cfg-connection"
          provider="MICROSOFT"
          value={connectionId}
          invalid={!!error('connectionId')}
          onChange={(id) => {
            // Resources belong to the connection: choosing another clears the old one.
            setMany({ connectionId: id, listId: undefined }, 'connectionId');
          }}
        />
      </Field>
      <Field id="cfg-list" label="To Do list" error={error('listId')}>
        <ResourcePicker
          id="cfg-list"
          label="Lists"
          waitingText={connectionId ? undefined : 'Choose a connection first.'}
          items={lists.data?.map((l) => ({
            id: l.id,
            label: l.displayName,
            icon: ListTodo,
            detail: l.isDefault ? 'Default' : undefined,
          }))}
          value={str(config.listId) || undefined}
          onChange={(v) => set('listId', v)}
          isLoading={lists.isLoading}
          error={lists.error}
          onRetry={() => void lists.refetch()}
          emptyText="This account has no To Do lists."
          invalid={!!error('listId')}
        />
      </Field>
      <Field id="cfg-title" label="Title" error={error('title')}>
        <TemplateInput
          id="cfg-title"
          value={str(config.title)}
          onChange={(v) => set('title', v)}
          onBlur={() => touch('title')}
          maxLength={LIMITS.todoTitle}
          invalid={!!error('title')}
          placeholder="Follow up: {{ trigger.issue.title }}"
        />
      </Field>
      <Field id="cfg-body" label="Notes (optional)" error={error('body')}>
        <TemplateInput
          id="cfg-body"
          multiline
          value={str(config.body)}
          onChange={optional('body')}
          maxLength={LIMITS.todoBody}
          invalid={!!error('body')}
        />
      </Field>
      <Field
        id="cfg-due"
        label="Due date (optional)"
        error={error('dueDate')}
        hint="YYYY-MM-DD, or data from an earlier step."
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <TemplateInput
              id="cfg-due"
              value={str(config.dueDate)}
              onChange={optional('dueDate')}
              invalid={!!error('dueDate')}
              placeholder="2026-12-31"
            />
          </div>
          <label className="border-line hover:bg-canvas relative flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-sm">
            <CalendarDays className="text-muted size-4" aria-hidden />
            <span className="sr-only">Pick a due date</span>
            <input
              type="date"
              disabled={readOnly}
              aria-label="Pick a due date"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => optional('dueDate')(e.target.value)}
            />
          </label>
        </div>
      </Field>
    </>
  );
}

/** AI input: text with placeholders, or one value passed as-is (`{ ref }`, keeps its type). */
function AiTextField({ config, set, error, touch }: FormProps) {
  const { readOnly } = useConfigScope();
  const value = config.text;
  const asRef = typeof value === 'object' && value !== null && 'ref' in value;
  const toRef = () => {
    const single = /^\{\{\s*([^{}\s]+)\s*\}\}$/.exec(str(value).trim());
    set('text', { ref: single?.[1] ?? '' });
  };
  const toText = () => {
    const ref = (value as { ref: string }).ref;
    set('text', ref ? `{{ ${ref} }}` : '');
  };
  return (
    <Field id="cfg-text" label="Text to analyse" error={error('text')}>
      <div className="space-y-2">
        <div
          role="radiogroup"
          aria-label="Input type"
          className="bg-canvas inline-flex rounded-md p-0.5 text-xs"
        >
          {[
            { on: !asRef, label: 'Text with data', pick: toText },
            { on: asRef, label: 'One value as-is', pick: toRef },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={o.on}
              disabled={readOnly}
              onClick={() => !o.on && o.pick()}
              className={cn(
                'rounded px-2.5 py-1',
                o.on ? 'bg-surface font-medium shadow-sm' : 'text-muted',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {asRef ? (
          <ReferenceInput
            id="cfg-text"
            label="Text to analyse"
            value={(value as { ref: string }).ref}
            invalid={!!error('text')}
            onChange={(ref) => set('text', { ref })}
          />
        ) : (
          <TemplateInput
            id="cfg-text"
            multiline
            value={str(value)}
            onChange={(v) => set('text', v)}
            onBlur={() => touch('text')}
            invalid={!!error('text')}
            placeholder="{{ trigger.issue.title }}&#10;{{ trigger.issue.body }}"
          />
        )}
      </div>
    </Field>
  );
}

function SummarizeForm(props: FormProps) {
  const { config, set, error } = props;
  const { readOnly } = useConfigScope();
  const [draft, setDraft] = useState(config.maxWords === undefined ? '' : String(config.maxWords));
  return (
    <>
      <AiTextField {...props} />
      <Field
        id="cfg-max-words"
        label="Maximum words"
        error={error('maxWords')}
        hint={`${LIMITS.summarizeWords.min}–${LIMITS.summarizeWords.max}; ${LIMITS.summarizeWords.default} if empty.`}
      >
        <Input
          id="cfg-max-words"
          inputMode="numeric"
          value={draft}
          disabled={readOnly}
          placeholder={String(LIMITS.summarizeWords.default)}
          aria-invalid={!!error('maxWords') || undefined}
          aria-describedby="cfg-max-words-msg"
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            set(
              'maxWords',
              e.target.value.trim() === '' ? undefined : Number.isFinite(n) ? n : e.target.value,
            );
          }}
        />
      </Field>
    </>
  );
}

function ClassifyForm(props: FormProps) {
  const { config, set, error } = props;
  const { readOnly } = useConfigScope();
  const labels = Array.isArray(config.labels) ? (config.labels as string[]) : [];
  const [draft, setDraft] = useState('');
  const add = () => {
    const label = draft.trim();
    if (!label) return;
    set('labels', [...labels, label]);
    setDraft('');
  };
  return (
    <>
      <AiTextField {...props} />
      <Field
        id="cfg-labels"
        label="Labels"
        error={error('labels')}
        hint={`${LIMITS.classifyLabels.min}–${LIMITS.classifyLabels.max} labels; the step answers with exactly one.`}
      >
        <div className="space-y-2">
          {labels.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Labels">
              {labels.map((l, i) => (
                <li
                  key={`${l}-${i}`}
                  className="bg-primary-soft text-ink inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs"
                >
                  {l}
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`Remove label ${l}`}
                      onClick={() =>
                        set(
                          'labels',
                          labels.filter((_, j) => j !== i),
                        )
                      }
                      className="hover:text-status-failed rounded-full p-0.5"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!readOnly && labels.length < LIMITS.classifyLabels.max && (
            <div className="flex gap-2">
              <Input
                id="cfg-labels"
                value={draft}
                maxLength={LIMITS.classifyLabels.length}
                placeholder="e.g. HIGH"
                aria-describedby="cfg-labels-msg"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    add();
                  }
                }}
              />
              <Button variant="secondary" onClick={add} disabled={!draft.trim()}>
                <Plus className="size-4" aria-hidden />
                Add
              </Button>
            </div>
          )}
        </div>
      </Field>
      <Field
        id="cfg-field"
        label="What is being classified (optional)"
        error={error('field')}
        hint='Helps the model, e.g. "priority" or "sentiment".'
      >
        <Input
          id="cfg-field"
          value={str(config.field)}
          disabled={readOnly}
          maxLength={LIMITS.classifyField}
          aria-describedby="cfg-field-msg"
          onChange={(e) => set('field', e.target.value === '' ? undefined : e.target.value)}
        />
      </Field>
    </>
  );
}

type ExtractField = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  enumValues?: string[];
  required?: boolean;
  description?: string;
};

function ExtractForm(props: FormProps) {
  const { config, set, error } = props;
  const { readOnly } = useConfigScope();
  const fields = Array.isArray(config.fields) ? (config.fields as ExtractField[]) : [];
  const update = (i: number, patch: Partial<ExtractField>) =>
    set(
      'fields',
      fields.map((f, j) => {
        if (j !== i) return f;
        const next = { ...f, ...patch };
        if (next.type !== 'enum') delete next.enumValues;
        else next.enumValues ??= [];
        if (next.description === '') delete next.description;
        return next;
      }),
    );
  return (
    <>
      <AiTextField {...props} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Fields to extract</legend>
        {error('fields', true) && !fields.length && (
          <p role="alert" className="text-status-failed text-sm">
            {error('fields', true)}
          </p>
        )}
        {fields.map((f, i) => (
          <div key={i} className="border-line space-y-2 rounded-lg border p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  aria-label={`Field ${i + 1} name`}
                  value={f.name}
                  disabled={readOnly}
                  placeholder="name"
                  aria-invalid={!!error(`fields.${i}.name`) || undefined}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="h-9 font-mono text-xs"
                />
              </div>
              <Select
                aria-label={`Field ${i + 1} type`}
                value={f.type}
                disabled={readOnly}
                onChange={(e) => update(i, { type: e.target.value as ExtractField['type'] })}
                className="h-9 w-28 text-xs"
              >
                <option value="string">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Yes / no</option>
                <option value="enum">One of…</option>
              </Select>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Remove field ${i + 1}`}
                  onClick={() =>
                    set(
                      'fields',
                      fields.filter((_, j) => j !== i),
                    )
                  }
                  className="text-muted hover:text-status-failed mt-2 rounded p-0.5"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
            {f.type === 'enum' && (
              <EnumValues
                label={`Field ${i + 1} values`}
                values={f.enumValues ?? []}
                onChange={(enumValues) => update(i, { enumValues })}
              />
            )}
            <Input
              aria-label={`Field ${i + 1} description`}
              value={f.description ?? ''}
              disabled={readOnly}
              placeholder="Description (optional) — what to look for"
              maxLength={LIMITS.extractDescription}
              onChange={(e) => update(i, { description: e.target.value })}
              className="h-9 text-xs"
            />
            <CheckboxRow
              id={`cfg-field-${i}-required`}
              checked={f.required !== false}
              onChange={(on) => update(i, { required: on })}
              label="Required"
            />
            {Object.entries(fieldErrors(error, i)).map(([k, m]) => (
              <p key={k} role="alert" className="text-status-failed text-xs">
                {m}
              </p>
            ))}
          </div>
        ))}
        {error('fields', true) && fields.length > 0 && (
          <p role="alert" className="text-status-failed text-sm">
            {error('fields', true)}
          </p>
        )}
        {!readOnly && fields.length < LIMITS.extractFields.max && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => set('fields', [...fields, { name: '', type: 'string', required: true }])}
          >
            <Plus className="size-4" aria-hidden />
            Add field
          </Button>
        )}
      </fieldset>
    </>
  );
}

const fieldErrors = (error: FormProps['error'], i: number) => {
  const out: Record<string, string> = {};
  for (const k of ['name', 'enumValues', 'description', 'type']) {
    const m = error(`fields.${i}.${k}`);
    if (m) out[k] = m;
  }
  return out;
};

/** Comma-separated values, kept as typed until committed so commas can be typed. */
function EnumValues({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const { readOnly } = useConfigScope();
  const [draft, setDraft] = useState(values.join(', '));
  return (
    <Input
      aria-label={label}
      value={draft}
      disabled={readOnly}
      placeholder="Values, separated by commas"
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(
          e.target.value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        );
      }}
      className="h-9 text-xs"
    />
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
  icon,
}: {
  id: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  icon?: ReactNode;
}) {
  const { readOnly } = useConfigScope();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary size-4"
      />
      {icon}
      {label}
    </label>
  );
}
