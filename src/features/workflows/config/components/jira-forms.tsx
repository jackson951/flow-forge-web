import { CircleAlert, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import {
  useJiraIssueTypes,
  useJiraProjects,
  useJiraSites,
  useJiraStatuses,
  useJiraUsers,
} from '@/features/integrations/api/integrations.api';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { useConfigScope } from '../config-scope';
import type { FormProps } from './node-forms';
import { ConnectionSelect } from './connection-select';
import { ResourcePicker, type ResourceItem } from './resource-picker';
import { TemplateInput } from './template-input';

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
type JiraProps = FormProps & { type: string };

export function JiraForm(props: JiraProps) {
  if (props.type.startsWith('jira.issue.')) return <JiraTriggerForm {...props} />;
  switch (props.type) {
    case 'jira.createIssue':
      return <CreateIssueForm {...props} />;
    case 'jira.updateIssue':
      return <UpdateIssueForm {...props} />;
    case 'jira.getIssue':
      return <IssueFieldsForm {...props} />;
    case 'jira.addComment':
      return <CommentForm {...props} />;
    case 'jira.transitionIssue':
      return <TransitionForm {...props} />;
    case 'jira.assignIssue':
      return <AssignForm {...props} />;
    case 'jira.searchIssues':
      return <SearchForm {...props} />;
    default:
      return null;
  }
}

function JiraFoundation({
  config,
  setMany,
  error,
  children,
}: FormProps & { children?: React.ReactNode }) {
  const workspace = useWorkspace();
  const connectionId = str(config.connectionId) || undefined;
  const siteId = str(config.siteId) || undefined;
  const sites = useJiraSites(workspace.id, connectionId);
  const { readOnly } = useConfigScope();
  useEffect(() => {
    if (!readOnly && !siteId && sites.data?.length === 1)
      setMany({ siteId: sites.data[0].cloudId }, 'siteId');
  }, [readOnly, siteId, sites.data, setMany]);
  const clear = {
    projectKey: undefined,
    projectKeys: undefined,
    issueType: undefined,
    issueTypes: undefined,
    fromStatus: undefined,
    toStatus: undefined,
    assigneeAccountId: undefined,
  };
  return (
    <>
      <Field id="cfg-connection" label="Jira connection" error={error('connectionId')}>
        <ConnectionSelect
          id="cfg-connection"
          provider="JIRA"
          value={connectionId}
          invalid={!!error('connectionId')}
          onChange={(id) =>
            setMany({ connectionId: id, siteId: undefined, ...clear }, 'connectionId')
          }
        />
      </Field>
      <Field id="cfg-site" label="Jira site" error={error('siteId')}>
        <ResourcePicker
          id="cfg-site"
          label="Sites"
          waitingText={connectionId ? undefined : 'Choose a connection first.'}
          items={sites.data?.map((site) => ({
            id: site.cloudId,
            label: site.name,
            detail: site.url.replace(/^https?:\/\//, ''),
          }))}
          value={siteId}
          onChange={(id) => setMany({ siteId: id, ...clear }, 'siteId')}
          isLoading={sites.isLoading}
          error={sites.error}
          onRetry={() => void sites.refetch()}
          emptyText="No Jira sites are visible to this account."
          invalid={!!error('siteId')}
        />
      </Field>
      {children}
    </>
  );
}

function useProjectItems(config: Record<string, unknown>) {
  const workspace = useWorkspace();
  const query = useJiraProjects(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
  );
  return {
    query,
    items: query.data
      ?.filter((p) => p.key)
      .map((p) => ({
        id: p.key!,
        label: p.name || p.key!,
        detail: p.key!,
      })),
  };
}

function ProjectPicker({
  config,
  value,
  onChange,
  invalid,
  id = 'cfg-project',
}: {
  config: Record<string, unknown>;
  value?: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  const { query, items } = useProjectItems(config);
  const ready = !!str(config.connectionId) && !!str(config.siteId);
  return (
    <ResourcePicker
      id={id}
      label="Projects"
      waitingText={ready ? undefined : 'Choose a connection and site first.'}
      items={items}
      value={value}
      onChange={onChange}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyText="No projects are visible to this account."
      invalid={invalid}
    />
  );
}

function MultiPicker({
  label,
  items,
  values,
  onChange,
  max,
  waiting,
  loading,
  error,
  empty,
}: {
  label: string;
  items?: ResourceItem[];
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  waiting?: string;
  loading: boolean;
  error?: Error | null;
  empty: string;
}) {
  const { readOnly } = useConfigScope();
  if (waiting)
    return <p className="bg-canvas text-muted rounded-lg px-3 py-2 text-sm">{waiting}</p>;
  if (loading) return <p className="text-muted text-sm">Loading {label.toLowerCase()}...</p>;
  if (error)
    return (
      <p role="alert" className="text-status-failed flex gap-1.5 text-sm">
        <CircleAlert className="size-4" aria-hidden /> Could not load {label.toLowerCase()}.
      </p>
    );
  return (
    <div
      className="border-line max-h-52 overflow-y-auto rounded-lg border p-1"
      role="group"
      aria-label={label}
    >
      {!items?.length && <p className="text-muted px-2 py-1.5 text-sm">{empty}</p>}
      {items?.map((item) => {
        const checked = values.includes(item.id);
        return (
          <label
            key={item.id}
            className="hover:bg-canvas flex items-center gap-2 rounded px-2 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={readOnly || (!checked && values.length >= max)}
              onChange={() =>
                onChange(checked ? values.filter((v) => v !== item.id) : [...values, item.id])
              }
              className="accent-primary size-4"
            />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.detail && <span className="text-muted text-xs">{item.detail}</span>}
          </label>
        );
      })}
      {values.some((value) => !items?.some((item) => item.id === value)) && (
        <p className="text-status-warning border-line border-t px-2 py-1.5 text-xs">
          A saved selection no longer exists. Review this field before publishing.
        </p>
      )}
    </div>
  );
}

function JiraTriggerForm(props: JiraProps) {
  const { config, set, setMany, error, type } = props;
  const workspace = useWorkspace();
  const { query: projects, items: projectItems } = useProjectItems(config);
  const projectKeys = strings(config.projectKeys);
  const scopeProject = projectKeys[0];
  const issueTypes = useJiraIssueTypes(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
    scopeProject,
  );
  const statuses = useJiraStatuses(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
    scopeProject,
  );
  return (
    <JiraFoundation {...props}>
      <Field
        id="cfg-projects"
        label="Projects"
        error={error('projectKeys')}
        hint="Choose 1 to 20 projects."
      >
        <MultiPicker
          label="Projects"
          items={projectItems}
          values={projectKeys}
          max={20}
          waiting={str(config.siteId) ? undefined : 'Choose a site first.'}
          loading={projects.isLoading}
          error={projects.error}
          empty="No projects are visible to this account."
          onChange={(values) =>
            setMany(
              {
                projectKeys: values,
                issueTypes: undefined,
                fromStatus: undefined,
                toStatus: undefined,
              },
              'projectKeys',
            )
          }
        />
      </Field>
      <Field
        id="cfg-issue-types"
        label="Issue types (optional)"
        error={error('issueTypes')}
        hint={
          projectKeys.length > 1
            ? 'Loaded from the first selected project.'
            : 'Empty means any issue type.'
        }
      >
        <MultiPicker
          label="Issue types"
          items={issueTypes.data
            ?.filter((i) => i.name)
            .map((i) => ({ id: i.name!, label: i.name! }))}
          values={strings(config.issueTypes)}
          max={20}
          waiting={scopeProject ? undefined : 'Choose at least one project first.'}
          loading={issueTypes.isLoading}
          error={issueTypes.error}
          empty="No issue types are available in this project."
          onChange={(values) => set('issueTypes', values.length ? values : undefined)}
        />
      </Field>
      {type === 'jira.issue.transitioned' && (
        <>
          <StatusPicker
            label="From status (optional)"
            field="fromStatus"
            config={config}
            set={set}
            query={statuses}
          />
          <StatusPicker
            label="To status (optional)"
            field="toStatus"
            config={config}
            set={set}
            query={statuses}
          />
        </>
      )}
      <Notice>
        After publishing, FlowForge registers and renews the Jira webhook automatically. Nothing
        needs to be configured in Jira.
      </Notice>
    </JiraFoundation>
  );
}

function StatusPicker({
  label,
  field,
  config,
  set,
  query,
}: {
  label: string;
  field: string;
  config: Record<string, unknown>;
  set: FormProps['set'];
  query: ReturnType<typeof useJiraStatuses>;
}) {
  return (
    <Field id={`cfg-${field}`} label={label} hint="Empty means any status.">
      <ResourcePicker
        id={`cfg-${field}`}
        label="Statuses"
        waitingText={query.fetchStatus === 'idle' ? 'Choose a project first.' : undefined}
        items={[
          { id: '', label: 'Any status' },
          ...(query.data?.map((s) => ({ id: s.name, label: s.name })) ?? []),
        ]}
        value={str(config[field]) || undefined}
        onChange={(value) => set(field, value || undefined)}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No statuses are available in this project."
      />
    </Field>
  );
}

function CreateIssueForm(props: JiraProps) {
  const { config, set, setMany, error, touch } = props;
  const workspace = useWorkspace();
  const [userQuery, setUserQuery] = useState('');
  const project = str(config.projectKey) || undefined;
  const issueTypes = useJiraIssueTypes(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
    project,
  );
  const users = useJiraUsers(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
    project,
    userQuery,
  );
  return (
    <JiraFoundation {...props}>
      <Field id="cfg-project" label="Project" error={error('projectKey')}>
        <ProjectPicker
          config={config}
          value={project}
          invalid={!!error('projectKey')}
          onChange={(value) =>
            setMany(
              { projectKey: value, issueType: undefined, assigneeAccountId: undefined },
              'projectKey',
            )
          }
        />
      </Field>
      <Field id="cfg-issue-type" label="Issue type" error={error('issueType')}>
        <ResourcePicker
          id="cfg-issue-type"
          label="Issue types"
          waitingText={project ? undefined : 'Choose a project first.'}
          items={issueTypes.data
            ?.filter((i) => i.name)
            .map((i) => ({
              id: i.id || i.name!,
              label: i.name!,
              detail: i.subtask ? 'Subtask' : undefined,
            }))}
          value={str(config.issueType) || undefined}
          onChange={(value) => set('issueType', value)}
          isLoading={issueTypes.isLoading}
          error={issueTypes.error}
          onRetry={() => void issueTypes.refetch()}
          emptyText="No issue types are available in this project."
          invalid={!!error('issueType')}
        />
      </Field>
      <TemplateField
        label="Summary"
        field="summary"
        config={config}
        set={set}
        touch={touch}
        error={error('summary')}
        maxLength={255}
      />
      <TemplateField
        label="Description (optional)"
        field="description"
        config={config}
        set={set}
        touch={touch}
        error={error('description')}
        maxLength={32000}
        multiline
      />
      <TextField
        label="Priority (optional)"
        field="priority"
        config={config}
        set={set}
        error={error('priority')}
        maxLength={60}
      />
      <CsvField
        label="Labels (optional)"
        field="labels"
        config={config}
        set={set}
        error={error('labels')}
        hint="Up to 20 labels; spaces are not allowed."
      />
      <UserPicker config={config} set={set} query={users} onSearch={setUserQuery} optional />
      <CustomFields config={config} set={set} error={error} />
    </JiraFoundation>
  );
}

function IssueKeyField(props: FormProps) {
  return (
    <TemplateField
      label="Issue key"
      field="issueKey"
      config={props.config}
      set={props.set}
      touch={props.touch}
      error={props.error('issueKey')}
      maxLength={200}
      hint={
        str(props.config.issueKey).includes('{{')
          ? 'Resolved at run time.'
          : 'For example, ENG-123.'
      }
    />
  );
}

function UpdateIssueForm(props: JiraProps) {
  const { config, set, error, touch } = props;
  return (
    <JiraFoundation {...props}>
      <IssueKeyField {...props} />
      <TemplateField
        label="Summary (optional)"
        field="summary"
        config={config}
        set={set}
        touch={touch}
        error={error('summary')}
        maxLength={255}
      />
      <TemplateField
        label="Description (optional)"
        field="description"
        config={config}
        set={set}
        touch={touch}
        error={error('description')}
        maxLength={32000}
        multiline
      />
      <TextField
        label="Priority (optional)"
        field="priority"
        config={config}
        set={set}
        error={error('priority')}
        maxLength={60}
      />
      <CsvField
        label="Labels (optional)"
        field="labels"
        config={config}
        set={set}
        error={error('labels')}
      />
      <CustomFields config={config} set={set} error={error} />
      {error('') && (
        <p role="alert" className="text-status-failed text-sm">
          {error('')}
        </p>
      )}
    </JiraFoundation>
  );
}

function IssueFieldsForm(props: JiraProps) {
  return (
    <JiraFoundation {...props}>
      <IssueKeyField {...props} />
      <CsvField
        label="Extra fields (optional)"
        field="fields"
        config={props.config}
        set={props.set}
        error={props.error('fields')}
        hint="Up to 30 Jira field names. Standard issue fields are always returned."
      />
    </JiraFoundation>
  );
}

function CommentForm(props: JiraProps) {
  return (
    <JiraFoundation {...props}>
      <IssueKeyField {...props} />
      <TemplateField
        label="Comment"
        field="text"
        config={props.config}
        set={props.set}
        touch={props.touch}
        error={props.error('text')}
        maxLength={32000}
        multiline
      />
    </JiraFoundation>
  );
}

function TransitionForm(props: JiraProps) {
  const { config, setMany, error } = props;
  const workspace = useWorkspace();
  const [project, setProject] = useState('');
  const statuses = useJiraStatuses(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
    project || undefined,
  );
  const advanced = !!str(config.transitionId);
  const { readOnly } = useConfigScope();
  return (
    <JiraFoundation {...props}>
      <IssueKeyField {...props} />
      {!advanced && (
        <>
          <Field
            id="cfg-transition-project"
            label="Project (for status choices)"
            hint="Used only to load statuses; it is not saved in the step."
          >
            <ProjectPicker
              id="cfg-transition-project"
              config={config}
              value={project || undefined}
              onChange={setProject}
            />
          </Field>
          <Field id="cfg-to-status" label="Target status" error={error('toStatus')}>
            <ResourcePicker
              id="cfg-to-status"
              label="Statuses"
              waitingText={project ? undefined : 'Choose the issue project first.'}
              items={statuses.data?.map((s) => ({ id: s.name, label: s.name }))}
              value={str(config.toStatus) || undefined}
              onChange={(value) =>
                setMany({ toStatus: value, transitionId: undefined }, 'toStatus')
              }
              isLoading={statuses.isLoading}
              error={statuses.error}
              onRetry={() => void statuses.refetch()}
              emptyText="No statuses are available in this project."
              invalid={!!error('toStatus')}
            />
          </Field>
        </>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={advanced}
          disabled={readOnly}
          onChange={(event) =>
            setMany(
              event.target.checked
                ? { toStatus: undefined, transitionId: '' }
                : { transitionId: undefined },
              'transitionId',
            )
          }
          className="accent-primary size-4"
        />
        Use a transition id (advanced)
      </label>
      {advanced && (
        <TextField
          label="Transition id"
          field="transitionId"
          config={config}
          set={props.set}
          error={error('transitionId')}
        />
      )}
      <Notice>
        A target status is resolved against the issue's available transitions at run time. The step
        fails clearly when that status is not reachable from its current status.
      </Notice>
      {error('') && (
        <p role="alert" className="text-status-failed text-sm">
          {error('')}
        </p>
      )}
    </JiraFoundation>
  );
}

function AssignForm(props: JiraProps) {
  const { config, set } = props;
  const workspace = useWorkspace();
  const [project, setProject] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const users = useJiraUsers(
    workspace.id,
    str(config.connectionId) || undefined,
    str(config.siteId) || undefined,
    project || undefined,
    userQuery,
  );
  return (
    <JiraFoundation {...props}>
      <IssueKeyField {...props} />
      <Field
        id="cfg-assignee-project"
        label="Project (for assignee choices)"
        hint="Used only to search assignable users; it is not saved in the step."
      >
        <ProjectPicker
          id="cfg-assignee-project"
          config={config}
          value={project || undefined}
          onChange={setProject}
        />
      </Field>
      <UserPicker
        config={config}
        set={set}
        query={users}
        onSearch={setUserQuery}
        allowUnassigned
        error={props.error('assigneeAccountId')}
      />
    </JiraFoundation>
  );
}

function SearchForm(props: JiraProps) {
  const maxResults = typeof props.config.maxResults === 'number' ? props.config.maxResults : 25;
  const { readOnly } = useConfigScope();
  return (
    <JiraFoundation {...props}>
      <TemplateField
        label="JQL"
        field="jql"
        config={props.config}
        set={props.set}
        touch={props.touch}
        error={props.error('jql')}
        maxLength={2000}
        multiline
        hint="Passed to Jira exactly as entered; FlowForge never evaluates it."
      />
      <a
        href="https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/"
        target="_blank"
        rel="noreferrer"
        className="text-primary text-sm hover:underline"
      >
        Open Atlassian's JQL help
      </a>
      <Field id="cfg-max-results" label="Maximum results" error={props.error('maxResults')}>
        <Input
          id="cfg-max-results"
          type="number"
          min={1}
          max={100}
          value={maxResults}
          disabled={readOnly}
          onChange={(event) => props.set('maxResults', Number(event.target.value))}
        />
      </Field>
      <CsvField
        label="Extra fields (optional)"
        field="fields"
        config={props.config}
        set={props.set}
        error={props.error('fields')}
        hint="Up to 30 Jira field names."
      />
    </JiraFoundation>
  );
}

function UserPicker({
  config,
  set,
  query,
  onSearch,
  optional,
  allowUnassigned,
  error,
}: {
  config: Record<string, unknown>;
  set: FormProps['set'];
  query: ReturnType<typeof useJiraUsers>;
  onSearch?: (query: string) => void;
  optional?: boolean;
  allowUnassigned?: boolean;
  error?: string;
}) {
  const items = query.data?.map((u) => ({
    id: u.accountId,
    label: u.displayName || u.accountId,
    detail: u.accountId,
  }));
  if (allowUnassigned)
    items?.unshift({
      id: 'unassigned',
      label: 'Unassigned',
      detail: 'Remove the current assignee',
    });
  if (optional) items?.unshift({ id: '', label: 'No assignee', detail: '' });
  return (
    <Field id="cfg-assignee" label={optional ? 'Assignee (optional)' : 'Assignee'} error={error}>
      <ResourcePicker
        id="cfg-assignee"
        label="Assignable users"
        waitingText={query.fetchStatus === 'idle' ? 'Choose a project first.' : undefined}
        items={items}
        value={str(config.assigneeAccountId) || undefined}
        onChange={(value) => set('assigneeAccountId', value || undefined)}
        onSearch={onSearch}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No assignable users match this project."
        invalid={!!error}
      />
    </Field>
  );
}

function TemplateField({
  label,
  field,
  config,
  set,
  touch,
  error,
  maxLength,
  multiline,
  hint,
}: {
  label: string;
  field: string;
  config: Record<string, unknown>;
  set: FormProps['set'];
  touch: FormProps['touch'];
  error?: string;
  maxLength: number;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <Field id={`cfg-${field}`} label={label} error={error} hint={hint}>
      <TemplateInput
        id={`cfg-${field}`}
        value={str(config[field])}
        onChange={(value) => set(field, value || undefined)}
        onBlur={() => touch(field)}
        maxLength={maxLength}
        multiline={multiline}
        invalid={!!error}
      />
    </Field>
  );
}

function TextField({
  label,
  field,
  config,
  set,
  error,
  maxLength,
}: {
  label: string;
  field: string;
  config: Record<string, unknown>;
  set: FormProps['set'];
  error?: string;
  maxLength?: number;
}) {
  const { readOnly } = useConfigScope();
  return (
    <Field id={`cfg-${field}`} label={label} error={error}>
      <Input
        id={`cfg-${field}`}
        value={str(config[field])}
        maxLength={maxLength}
        disabled={readOnly}
        aria-invalid={!!error || undefined}
        onChange={(event) => set(field, event.target.value || undefined)}
      />
    </Field>
  );
}

function CsvField({
  label,
  field,
  config,
  set,
  error,
  hint,
}: {
  label: string;
  field: string;
  config: Record<string, unknown>;
  set: FormProps['set'];
  error?: string;
  hint?: string;
}) {
  const { readOnly } = useConfigScope();
  const [draft, setDraft] = useState(() => strings(config[field]).join(', '));
  return (
    <Field id={`cfg-${field}`} label={label} error={error} hint={hint}>
      <Input
        id={`cfg-${field}`}
        value={draft}
        placeholder="Comma-separated"
        disabled={readOnly}
        aria-invalid={!!error || undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = event.target.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          set(field, next.length ? next : undefined);
        }}
      />
    </Field>
  );
}

type CustomField = { key: string; type: 'string' | 'number' | 'boolean'; value: string };
function CustomFields({
  config,
  set,
  error,
}: {
  config: Record<string, unknown>;
  set: FormProps['set'];
  error: FormProps['error'];
}) {
  const { readOnly } = useConfigScope();
  const [fields, setFields] = useState<CustomField[]>(() =>
    Object.entries((config.customFields as Record<string, unknown> | undefined) ?? {}).map(
      ([key, value]) => ({
        key,
        type:
          typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
        value: String(value),
      }),
    ),
  );
  const save = (next: CustomField[]) => {
    setFields(next);
    const entries = next
      .filter((item) => item.key)
      .map((item) => [
        item.key,
        item.type === 'number'
          ? Number(item.value)
          : item.type === 'boolean'
            ? item.value === 'true'
            : item.value,
      ]);
    set('customFields', entries.length ? Object.fromEntries(entries) : undefined);
  };
  return (
    <details className="border-line rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">Custom fields (advanced)</summary>
      <div className="mt-3 space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="flex gap-2">
            <Input
              aria-label={`Custom field ${index + 1} id`}
              value={field.key}
              disabled={readOnly}
              placeholder="customfield_10010"
              onChange={(event) =>
                save(
                  fields.map((item, i) =>
                    i === index ? { ...item, key: event.target.value } : item,
                  ),
                )
              }
            />
            <Select
              aria-label={`Custom field ${index + 1} type`}
              value={field.type}
              disabled={readOnly}
              onChange={(event) =>
                save(
                  fields.map((item, i) =>
                    i === index
                      ? { ...item, type: event.target.value as CustomField['type'] }
                      : item,
                  ),
                )
              }
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Yes / no</option>
            </Select>
            {field.type === 'boolean' ? (
              <Select
                aria-label={`Custom field ${index + 1} value`}
                value={field.value}
                disabled={readOnly}
                onChange={(event) =>
                  save(
                    fields.map((item, i) =>
                      i === index ? { ...item, value: event.target.value } : item,
                    ),
                  )
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            ) : (
              <Input
                aria-label={`Custom field ${index + 1} value`}
                value={field.value}
                disabled={readOnly}
                onChange={(event) =>
                  save(
                    fields.map((item, i) =>
                      i === index ? { ...item, value: event.target.value } : item,
                    ),
                  )
                }
              />
            )}
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove custom field ${index + 1}`}
                onClick={() => save(fields.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
        {error('customFields', true) && (
          <p role="alert" className="text-status-failed text-sm">
            {error('customFields', true)}
          </p>
        )}
        {!readOnly && fields.length < 20 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => save([...fields, { key: '', type: 'string', value: '' }])}
          >
            <Plus className="size-4" />
            Add custom field
          </Button>
        )}
      </div>
    </details>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas text-muted flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
