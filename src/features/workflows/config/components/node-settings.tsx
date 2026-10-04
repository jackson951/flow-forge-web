import { ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ValidationIssue } from '@/types/api';
import type { NodeDefinition, WorkflowDefinition } from '../../types/workflow-definition';
import { ConfigScopeContext, type ConfigScope } from '../config-scope';
import { availableReferences, referenceProblem, type ReferenceSuggestion } from '../references';
import { configErrors, SECRET_HINT } from '../schemas';
import { NodeForm } from './node-forms';

interface NodeSettingsProps {
  node: NodeDefinition;
  definition: WorkflowDefinition;
  labelFor: (type: string) => string;
  /** The server's issues for this node from the last save (authoritative). */
  issues: ValidationIssue[];
  readOnly: boolean;
  onChange: (config: Record<string, unknown>, field: string) => void;
  /** Extra `trigger.<path>` suggestions, e.g. from a captured test delivery (Part 19). */
  sampleTriggerFields?: string[];
}

/** Adds captured-sample paths not already offered (source: the test delivery). */
function withSamples(base: ReferenceSuggestion[], paths: string[]): ReferenceSuggestion[] {
  const known = new Set(base.map((s) => s.ref));
  const extra = paths
    .map((p) => `trigger.${p}`)
    .filter((ref) => !known.has(ref))
    .map((ref) => ({
      ref,
      source: 'Test delivery',
      description: 'Seen in the captured test delivery',
    }));
  return [...base, ...extra];
}

/** Message for `path`: exact match, or (unless `exact`) the first below it ("labels.1"). */
const lookup = (messages: Record<string, string>, path: string, exact = false) =>
  messages[path] ??
  (exact ? undefined : Object.entries(messages).find(([p]) => p.startsWith(`${path}.`))?.[1]);

/**
 * The selected step's settings (Part 06, FR-06.1). Client validation (zod, mirroring the
 * backend) appears once a field has been edited or already has a value; the server's issues
 * from the last save always appear, on the same field (AC-06.5).
 */
export function NodeSettings({
  node,
  definition,
  labelFor,
  issues,
  readOnly,
  onChange,
  sampleTriggerFields,
}: NodeSettingsProps) {
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const config = node.config;

  const scope = useMemo<ConfigScope>(
    () => ({
      suggestions: withSamples(
        availableReferences(definition, node.key, labelFor),
        node.kind === 'TRIGGER' ? [] : (sampleTriggerFields ?? []),
      ),
      problem: (ref) => referenceProblem(definition, node.key, ref),
      readOnly,
      nodeKey: node.key,
    }),
    [definition, node.key, node.kind, labelFor, readOnly, sampleTriggerFields],
  );

  const client = useMemo(() => configErrors(node.type, config), [node.type, config]);
  const server = useMemo(() => {
    const byPath: Record<string, string> = {};
    for (const issue of issues) if (issue.path !== undefined) byPath[issue.path] ??= issue.message;
    return byPath;
  }, [issues]);

  const shown = (path: string) => {
    const root = path.split('.')[0];
    return touched.has(root) || config[root] !== undefined;
  };
  const error = (path: string, exact = false) =>
    (shown(path) ? lookup(client, path, exact) : undefined) ?? lookup(server, path, exact);

  // Conditions: client messages show once edited; server messages always.
  const errors = useMemo(() => {
    const visible = node.type === 'condition' && touched.size ? client : {};
    return { ...server, ...visible };
  }, [client, server, touched, node.type]);

  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));

  const setMany = (patch: Record<string, unknown>, field: string) => {
    const next = { ...config };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    for (const k of Object.keys(patch)) touch(k);
    onChange(next, field);
  };

  const needsSecretHint = node.type !== 'manual.trigger' && node.type !== 'condition';

  return (
    <ConfigScopeContext.Provider value={scope}>
      <div className="space-y-4">
        <NodeForm
          type={node.type}
          config={config}
          set={(field, value) => setMany({ [field]: value }, field)}
          setMany={setMany}
          replace={(next, field) => {
            touch('condition');
            onChange(next, field);
          }}
          error={error}
          errors={errors}
          touch={touch}
        />
        {needsSecretHint && (
          <p className="text-muted flex items-start gap-1.5 text-xs">
            <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
            {SECRET_HINT}
          </p>
        )}
      </div>
    </ConfigScopeContext.Provider>
  );
}
