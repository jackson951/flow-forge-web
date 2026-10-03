import {
  isComparison,
  UNARY_OPERATORS,
  type Comparison,
  type ConditionGroup,
  type ConditionNode,
  type Operand,
  type Operator,
} from './schemas';

/** Helpers for the condition builder; the tree is the backend grammar, edited immutably. */

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: 'equals',
  notEquals: 'does not equal',
  greaterThan: 'is greater than',
  greaterThanOrEqual: 'is at least',
  lessThan: 'is less than',
  lessThanOrEqual: 'is at most',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  exists: 'exists',
  notExists: 'does not exist',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
};

export type GroupType = 'all' | 'any' | 'not';

export const isUnary = (op: Operator) => UNARY_OPERATORS.includes(op);

export const emptyComparison = (): Comparison => ({
  left: { ref: '' },
  operator: 'equals',
  right: { value: '' },
});

export const defaultCondition = (): ConditionGroup => ({ all: [emptyComparison()] });

export const groupType = (g: ConditionGroup): GroupType =>
  'all' in g ? 'all' : 'any' in g ? 'any' : 'not';

export const groupChildren = (g: ConditionGroup): ConditionNode[] =>
  'all' in g ? g.all : 'any' in g ? g.any : [g.not];

/** Rebuilds a group with another type or children; `not` keeps only the first child. */
export function makeGroup(type: GroupType, children: ConditionNode[]): ConditionGroup {
  if (type === 'not') return { not: children[0] ?? emptyComparison() };
  return type === 'all' ? { all: children } : { any: children };
}

/** Changing the operator keeps the right operand only when the new one needs it. */
export function withOperator(c: Comparison, operator: Operator): Comparison {
  if (isUnary(operator)) return { left: c.left, operator };
  return { left: c.left, operator, right: c.right ?? { value: '' } };
}

function describeOperand(o: Operand | undefined): string {
  if (!o) return '?';
  if ('ref' in o) return o.ref || '(choose data)';
  if (o.value === null) return 'empty';
  return typeof o.value === 'string' ? `"${o.value}"` : String(o.value);
}

/** Plain-language preview: `label equals "HIGH" AND (a exists OR NOT b is empty)`. */
export function describeCondition(node: ConditionNode, nested = false): string {
  if (isComparison(node)) {
    const left = describeOperand(node.left);
    const op = OPERATOR_LABELS[node.operator];
    return isUnary(node.operator)
      ? `${left} ${op}`
      : `${left} ${op} ${describeOperand(node.right)}`;
  }
  if ('not' in node) return `NOT ${describeCondition(node.not, true)}`;
  const children = 'all' in node ? node.all : node.any;
  const text = children
    .map((c) => describeCondition(c, true))
    .join('all' in node ? ' AND ' : ' OR ');
  return nested && children.length > 1 ? `(${text})` : text;
}

/** Reads a stored config as a condition, falling back to a fresh one for an empty config. */
export function asCondition(config: Record<string, unknown>): ConditionGroup {
  if ('all' in config || 'any' in config || 'not' in config) return config as ConditionGroup;
  return defaultCondition();
}
