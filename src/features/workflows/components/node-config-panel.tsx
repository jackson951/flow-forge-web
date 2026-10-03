import { CircleAlert, KeyRound, MousePointerClick, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { Button, Field, Input } from '@/components/ui';
import type { ValidationIssue } from '@/types/api';
import type { EditorAction } from '../editor/editor-reducer';
import { keyProblem } from '../editor/keys';
import { NodeSettings } from '../config/components/node-settings';
import type { NodeDefinition, WorkflowDefinition } from '../types/workflow-definition';

interface NodeConfigPanelProps {
  node: NodeDefinition | null;
  label: string;
  otherKeys: string[];
  issues: ValidationIssue[];
  dispatch: (action: EditorAction) => void;
  readOnly?: boolean;
  /** The whole draft: references may only point at steps before this one. */
  definition: WorkflowDefinition;
  labelFor: (type: string) => string;
}

/**
 * Right-hand panel for the selected step (Part 05): identity, key (how later steps reference
 * it), its type-specific settings (Part 06), its validation issues and delete.
 */
export function NodeConfigPanel(props: NodeConfigPanelProps) {
  if (!props.node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-full">
          <MousePointerClick className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-medium">Select a step</p>
        <p className="text-muted text-sm">
          Click a step on the canvas to see its details, or add one from the left.
        </p>
      </div>
    );
  }
  // Remount per node so the key field starts from the selected node.
  return <SelectedNodePanel key={props.node.key} {...props} node={props.node} />;
}

function SelectedNodePanel({
  node,
  label,
  otherKeys,
  issues,
  dispatch,
  readOnly = false,
  definition,
  labelFor,
}: NodeConfigPanelProps & { node: NodeDefinition }) {
  const [draftKey, setDraftKey] = useState(node.key);
  const problem = draftKey === node.key ? null : keyProblem(draftKey, otherKeys);

  const commitKey = () => {
    if (draftKey !== node.key && !problem) {
      dispatch({ type: 'renameKey', from: node.key, to: draftKey });
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <NodeTypeIcon type={node.type} />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{label}</h2>
          <p className="text-muted truncate font-mono text-xs">{node.type}</p>
        </div>
      </div>

      <Field
        id="node-key"
        label="Step key"
        error={problem ?? undefined}
        hint={
          problem
            ? undefined
            : `Later steps use it as {{steps.${node.key}.output…}}. Renaming updates those references.`
        }
      >
        <div className="relative">
          <KeyRound
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="node-key"
            value={draftKey}
            disabled={readOnly}
            aria-invalid={!!problem}
            aria-describedby="node-key-msg"
            className="pl-9 font-mono"
            onChange={(e) => setDraftKey(e.target.value)}
            onBlur={commitKey}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitKey();
              if (e.key === 'Escape') setDraftKey(node.key);
            }}
          />
        </div>
      </Field>

      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Settings2 className="text-muted size-4" aria-hidden />
          Settings
        </h3>
        <div className="mt-3">
          <NodeSettings
            node={node}
            definition={definition}
            labelFor={labelFor}
            issues={issues}
            readOnly={readOnly}
            onChange={(config, field) =>
              dispatch({ type: 'updateConfig', key: node.key, config, field })
            }
          />
        </div>
      </section>

      {issues.length > 0 && (
        <section aria-labelledby="node-issues">
          <h3
            id="node-issues"
            className="text-status-failed flex items-center gap-1.5 text-sm font-semibold"
          >
            <CircleAlert className="size-4" aria-hidden />
            {issues.length} issue{issues.length === 1 ? '' : 's'} from the last save
          </h3>
          <ul className="mt-2 space-y-1.5">
            {issues.map((issue, i) => (
              <li key={i} className="bg-status-failed/5 rounded-md px-2.5 py-1.5 text-sm">
                {issue.message}
                {issue.path && (
                  <span className="text-muted font-mono text-xs"> ({issue.path})</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!readOnly && (
        <Button
          variant="secondary"
          size="sm"
          className="text-status-failed w-full"
          onClick={() => dispatch({ type: 'removeNodes', keys: [node.key] })}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete step
        </Button>
      )}
    </div>
  );
}
