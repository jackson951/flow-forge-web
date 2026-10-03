import { CircleAlert, ListTree, MessageSquareText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useConfigScope } from '../config-scope';
import {
  describeCondition,
  emptyComparison,
  groupChildren,
  groupType,
  isUnary,
  makeGroup,
  OPERATOR_LABELS,
  withOperator,
  type GroupType,
} from '../condition-model';
import {
  CONDITION_LIMITS,
  isComparison,
  measureCondition,
  OPERATORS,
  type Comparison,
  type ConditionGroup,
  type ConditionNode,
  type Operand,
  type Operator,
} from '../schemas';
import { ReferenceInput } from './reference-input';

interface ConditionBuilderProps {
  value: ConditionGroup;
  /** `field` identifies the edited part, so typing in one input is one undo step. */
  onChange: (next: ConditionGroup, field: string) => void;
  /** Validation messages by path inside the condition ("all.0.right"). */
  errors: Record<string, string>;
}

const GROUP_LABELS: Record<GroupType, string> = {
  all: 'All of these are true (AND)',
  any: 'Any of these is true (OR)',
  not: 'This is NOT true',
};

const childPath = (path: string, type: GroupType, index: number) =>
  `${path ? `${path}.` : ''}${type === 'not' ? 'not' : `${type}.${index}`}`;

/** Messages for one part of the tree: exact path or anything below it. */
const errorsAt = (errors: Record<string, string>, path: string) =>
  Object.entries(errors)
    .filter(([p]) => p === path || p.startsWith(`${path}.`))
    .map(([, m]) => m);

/**
 * Structured condition editor for the backend grammar (Part 06, FR-06.5): groups all / any /
 * not, comparisons `{ left, operator, right }` with data references or fixed values. Depth and
 * size limits are enforced as you build; a plain-language preview sits on top.
 */
export function ConditionBuilder({ value, onChange, errors }: ConditionBuilderProps) {
  const { depth, comparisons } = measureCondition(value);
  const rootErrors = errors[''] ? [errors['']] : [];
  return (
    <div className="space-y-3">
      <div className="bg-canvas rounded-lg px-3 py-2 text-sm">
        <p className="text-muted flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <MessageSquareText className="size-3.5" aria-hidden />
          Takes the true branch when
        </p>
        <p className="mt-1 font-mono text-xs break-words" data-testid="condition-preview">
          {describeCondition(value)}
        </p>
      </div>
      <GroupEditor
        group={value}
        path=""
        depth={1}
        total={comparisons}
        errors={errors}
        onChange={(group, field) => onChange(group, field)}
      />
      <p className="text-muted text-xs">
        {comparisons}/{CONDITION_LIMITS.maxComparisons} comparisons · nesting {depth}/
        {CONDITION_LIMITS.maxDepth}
      </p>
      {rootErrors.map((m) => (
        <p key={m} role="alert" className="text-status-failed flex items-center gap-1.5 text-sm">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {m}
        </p>
      ))}
    </div>
  );
}

interface GroupEditorProps {
  group: ConditionGroup;
  path: string;
  depth: number;
  total: number;
  errors: Record<string, string>;
  onChange: (group: ConditionGroup, field: string) => void;
  onRemove?: () => void;
}

function GroupEditor({ group, path, depth, total, errors, onChange, onRemove }: GroupEditorProps) {
  const { readOnly } = useConfigScope();
  const type = groupType(group);
  const children = groupChildren(group);
  const roomForMore =
    type !== 'not' &&
    children.length < CONDITION_LIMITS.maxGroupSize &&
    total < CONDITION_LIMITS.maxComparisons;
  const canNest = roomForMore && depth < CONDITION_LIMITS.maxDepth;

  const setChild = (index: number, child: ConditionNode, field: string) => {
    const next = children.map((c, i) => (i === index ? child : c));
    onChange(makeGroup(type, next), field);
  };
  const removeChild = (index: number) =>
    onChange(
      makeGroup(
        type,
        children.filter((_, i) => i !== index),
      ),
      `${path}:remove`,
    );

  return (
    <fieldset
      className={cn(
        'space-y-2 rounded-lg border p-2.5',
        depth === 1 ? 'border-line' : 'border-indigo-200 bg-indigo-50/30',
      )}
    >
      <legend className="sr-only">Condition group</legend>
      <div className="flex items-center gap-2">
        <ListTree className="text-primary size-4 shrink-0" aria-hidden />
        <Select
          aria-label="Group type"
          value={type}
          disabled={readOnly}
          onChange={(e) =>
            onChange(makeGroup(e.target.value as GroupType, children), `${path}:type`)
          }
          className="h-8 text-xs"
        >
          {(['all', 'any', 'not'] as const).map((t) => (
            <option key={t} value={t} disabled={t === 'not' && children.length > 1}>
              {GROUP_LABELS[t]}
            </option>
          ))}
        </Select>
        {onRemove && !readOnly && (
          <button
            type="button"
            aria-label="Remove group"
            title="Remove group"
            onClick={onRemove}
            className="text-muted hover:text-status-failed rounded p-1"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {children.map((child, i) => {
          const p = childPath(path, type, i);
          const removable = type !== 'not' && children.length > 1;
          return (
            <li key={i}>
              {isComparison(child) ? (
                <ComparisonEditor
                  comparison={child}
                  path={p}
                  errors={errorsAt(errors, p)}
                  onChange={(c, field) => setChild(i, c, field)}
                  onRemove={removable ? () => removeChild(i) : undefined}
                />
              ) : (
                <GroupEditor
                  group={child}
                  path={p}
                  depth={depth + 1}
                  total={total}
                  errors={errors}
                  onChange={(g, field) => setChild(i, g, field)}
                  onRemove={removable ? () => removeChild(i) : undefined}
                />
              )}
            </li>
          );
        })}
      </ul>

      {!readOnly && type !== 'not' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!roomForMore}
            onClick={() =>
              onChange(makeGroup(type, [...children, emptyComparison()]), `${path}:add`)
            }
          >
            <Plus className="size-4" aria-hidden />
            Add comparison
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canNest}
            title={
              depth >= CONDITION_LIMITS.maxDepth
                ? `At most ${CONDITION_LIMITS.maxDepth} levels`
                : undefined
            }
            onClick={() =>
              onChange(makeGroup(type, [...children, { any: [emptyComparison()] }]), `${path}:add`)
            }
          >
            <ListTree className="size-4" aria-hidden />
            Add group
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function ComparisonEditor({
  comparison,
  path,
  errors,
  onChange,
  onRemove,
}: {
  comparison: Comparison;
  path: string;
  errors: string[];
  onChange: (c: Comparison, field: string) => void;
  onRemove?: () => void;
}) {
  const { readOnly } = useConfigScope();
  const id = `cond-${path.replace(/\./g, '-') || 'root'}`;
  return (
    <div
      className={cn(
        'bg-surface space-y-2 rounded-md border p-2',
        errors.length ? 'border-status-failed' : 'border-line',
      )}
    >
      <OperandEditor
        id={`${id}-left`}
        side="Left"
        operand={comparison.left}
        onChange={(left) => onChange({ ...comparison, left }, `${path}.left`)}
      />
      <div className="flex items-center gap-2">
        <Select
          aria-label="Operator"
          value={comparison.operator}
          disabled={readOnly}
          onChange={(e) =>
            onChange(withOperator(comparison, e.target.value as Operator), `${path}.operator`)
          }
          className="h-8 flex-1 text-xs"
        >
          {OPERATORS.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </Select>
        {onRemove && !readOnly && (
          <button
            type="button"
            aria-label="Remove comparison"
            title="Remove comparison"
            onClick={onRemove}
            className="text-muted hover:text-status-failed rounded p-1"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {!isUnary(comparison.operator) && (
        <OperandEditor
          id={`${id}-right`}
          side="Right"
          operand={comparison.right ?? { value: '' }}
          onChange={(right) => onChange({ ...comparison, right }, `${path}.right`)}
        />
      )}
      {errors.map((m) => (
        <p key={m} role="alert" className="text-status-failed flex items-center gap-1 text-xs">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {m}
        </p>
      ))}
    </div>
  );
}

type Mode = 'ref' | 'text' | 'number' | 'boolean' | 'null';

const modeOf = (o: Operand): Mode =>
  'ref' in o
    ? 'ref'
    : o.value === null
      ? 'null'
      : typeof o.value === 'number'
        ? 'number'
        : typeof o.value === 'boolean'
          ? 'boolean'
          : 'text';

const FRESH: Record<Mode, Operand> = {
  ref: { ref: '' },
  text: { value: '' },
  number: { value: 0 },
  boolean: { value: true },
  null: { value: null },
};

function OperandEditor({
  id,
  side,
  operand,
  onChange,
}: {
  id: string;
  side: 'Left' | 'Right';
  operand: Operand;
  onChange: (o: Operand) => void;
}) {
  const { readOnly } = useConfigScope();
  const mode = modeOf(operand);
  return (
    <div className="flex items-start gap-2">
      <Select
        aria-label={`${side} side type`}
        value={mode}
        disabled={readOnly}
        onChange={(e) => onChange(FRESH[e.target.value as Mode])}
        className="h-9 w-24 shrink-0 text-xs"
      >
        <option value="ref">Data</option>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="boolean">Yes / no</option>
        <option value="null">Empty</option>
      </Select>
      {'ref' in operand && (
        <ReferenceInput
          id={id}
          label={`${side} side data`}
          value={operand.ref}
          onChange={(ref) => onChange({ ref })}
        />
      )}
      {mode === 'text' && (
        <Input
          aria-label={`${side} side text`}
          value={String((operand as { value: string }).value)}
          disabled={readOnly}
          onChange={(e) => onChange({ value: e.target.value })}
          className="h-9 flex-1 text-sm"
        />
      )}
      {mode === 'number' && (
        <NumberValue
          label={`${side} side number`}
          value={(operand as { value: number }).value}
          onChange={(value) => onChange({ value })}
        />
      )}
      {mode === 'boolean' && (
        <Select
          aria-label={`${side} side value`}
          value={String((operand as { value: boolean }).value)}
          disabled={readOnly}
          onChange={(e) => onChange({ value: e.target.value === 'true' })}
          className="h-9 flex-1 text-sm"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      )}
      {mode === 'null' && (
        <span className="text-muted flex h-9 items-center text-xs">empty (null)</span>
      )}
    </div>
  );
}

/** Keeps what is typed until it is a valid number, so "-" or "1." can be typed. */
function NumberValue({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const { readOnly } = useConfigScope();
  const [draft, setDraft] = useState(String(value));
  // A complete number that differs from the value means it changed elsewhere (e.g. undo).
  const parsed = Number(draft);
  const stale = draft.trim() !== '' && Number.isFinite(parsed) && parsed !== value;
  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      value={stale ? String(value) : draft}
      disabled={readOnly}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(n);
      }}
      className="h-9 flex-1 text-sm"
    />
  );
}
