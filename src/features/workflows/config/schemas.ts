import { z, type ZodType } from 'zod';

/**
 * Node config schemas, written to match the backend's (flowforge-api: node-type-catalog.ts,
 * conditions.ts, github/slack/microsoft node-types, ai-tasks.ts). They give instant feedback
 * in the forms; the backend's validation issues stay authoritative (Part 07).
 */

export const LIMITS = {
  logMessage: 1_000,
  slackText: 3_000,
  todoTitle: 255,
  todoBody: 4_000,
  dueDate: 100,
  summarizeWords: { min: 20, max: 300, default: 100 },
  classifyLabels: { min: 2, max: 20, length: 50 },
  classifyField: 100,
  extractFields: { min: 1, max: 20 },
  extractEnumValues: { min: 1, max: 50, length: 100 },
  extractDescription: 200,
  operandValue: 1_000,
  reference: 300,
} as const;

export const OPERATORS = [
  'equals',
  'notEquals',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'contains',
  'startsWith',
  'endsWith',
  'exists',
  'notExists',
  'isEmpty',
  'isNotEmpty',
] as const;
export type Operator = (typeof OPERATORS)[number];
export const UNARY_OPERATORS: readonly Operator[] = [
  'exists',
  'notExists',
  'isEmpty',
  'isNotEmpty',
];
export const CONDITION_LIMITS = { maxDepth: 4, maxComparisons: 50, maxGroupSize: 20 } as const;

const REPOSITORY = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
const SLACK_CHANNEL = /^[CG][A-Z0-9]{2,30}$/;
const TODO_LIST_ID = /^[A-Za-z0-9=_+/-]{1,512}$/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,49}$/;

const connectionId = z
  .string({ required_error: 'Choose a connection' })
  .uuid('Choose a connection');
const uniqueIgnoringCase = (values: string[]) =>
  new Set(values.map((v) => v.toLowerCase())).size === values.length;

/** AI text input: a template string, or `{ ref }` to pass a value as-is. */
const aiText = z.union(
  [
    z.string({ required_error: 'Enter the text to analyse' }).min(1, 'Enter the text to analyse'),
    z.object({ ref: z.string().min(1) }).strict(),
  ],
  { errorMap: () => ({ message: 'Enter the text to analyse' }) },
);

// ── Conditions ───────────────────────────────────────────────────────────────

const operandSchema = z.union([
  z.object({ ref: z.string().min(1, 'Choose the data to compare').max(LIMITS.reference) }).strict(),
  z
    .object({
      value: z.union([z.string().max(LIMITS.operandValue), z.number(), z.boolean(), z.null()]),
    })
    .strict(),
]);

const comparisonSchema = z
  .object({ left: operandSchema, operator: z.enum(OPERATORS), right: operandSchema.optional() })
  .strict()
  .superRefine((c, ctx) => {
    const unary = UNARY_OPERATORS.includes(c.operator);
    if (unary && c.right) {
      ctx.addIssue({
        code: 'custom',
        path: ['right'],
        message: `"${c.operator}" takes no right operand`,
      });
    }
    if (!unary && !c.right) {
      ctx.addIssue({
        code: 'custom',
        path: ['right'],
        message: `"${c.operator}" needs a right operand`,
      });
    }
  });

export type Operand = z.infer<typeof operandSchema>;
export type Comparison = z.infer<typeof comparisonSchema>;
export type ConditionGroup =
  { all: ConditionNode[] } | { any: ConditionNode[] } | { not: ConditionNode };
export type ConditionNode = Comparison | ConditionGroup;

const groupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(nodeSchema).min(1).max(CONDITION_LIMITS.maxGroupSize) }).strict(),
    z.object({ any: z.array(nodeSchema).min(1).max(CONDITION_LIMITS.maxGroupSize) }).strict(),
    z.object({ not: nodeSchema }).strict(),
  ]),
);
const nodeSchema: z.ZodType<ConditionNode> = z.lazy(() => z.union([comparisonSchema, groupSchema]));

export const isComparison = (n: ConditionNode): n is Comparison => 'operator' in n;

/** Same measure as the backend: a top-level group of comparisons has depth 1. */
export function measureCondition(
  node: ConditionNode,
  depth = 0,
): { depth: number; comparisons: number } {
  if (isComparison(node)) return { depth, comparisons: 1 };
  const children = 'not' in node ? [node.not] : 'all' in node ? node.all : node.any;
  return children.reduce(
    (acc, child) => {
      const m = measureCondition(child, depth + 1);
      return { depth: Math.max(acc.depth, m.depth), comparisons: acc.comparisons + m.comparisons };
    },
    { depth: depth + 1, comparisons: 0 },
  );
}

export const conditionConfigSchema = groupSchema.superRefine((root, ctx) => {
  const { depth, comparisons } = measureCondition(root);
  if (depth > CONDITION_LIMITS.maxDepth) {
    ctx.addIssue({
      code: 'custom',
      message: `Conditions may nest at most ${CONDITION_LIMITS.maxDepth} groups deep`,
    });
  }
  if (comparisons > CONDITION_LIMITS.maxComparisons) {
    ctx.addIssue({
      code: 'custom',
      message: `At most ${CONDITION_LIMITS.maxComparisons} comparisons per condition`,
    });
  }
});

// ── Node types ───────────────────────────────────────────────────────────────

const extractFieldSchema = z
  .object({
    name: z
      .string()
      .regex(IDENTIFIER, 'Use letters, digits and _ (start with a letter)')
      .refine((n) => !['usage', 'meta'].includes(n), 'This name is reserved'),
    type: z.enum(['string', 'number', 'boolean', 'enum']),
    enumValues: z
      .array(z.string().trim().min(1).max(LIMITS.extractEnumValues.length))
      .min(1, 'Add at least one value')
      .max(LIMITS.extractEnumValues.max)
      .refine(uniqueIgnoringCase, 'Values must be unique')
      .optional(),
    required: z.boolean().default(true),
    description: z.string().max(LIMITS.extractDescription).optional(),
  })
  .strict()
  .refine((f) => (f.type === 'enum') === Boolean(f.enumValues), {
    message: 'Enum fields need values; other types have none',
    path: ['enumValues'],
  });

export const CONFIG_SCHEMAS: Record<string, ZodType> = {
  'manual.trigger': z.object({}).strict(),
  condition: conditionConfigSchema,
  'util.log': z
    .object({
      message: z
        .string({ required_error: 'Enter a message' })
        .min(1, 'Enter a message')
        .max(LIMITS.logMessage, `At most ${LIMITS.logMessage} characters`),
    })
    .strict(),
  'github.issue.created': z
    .object({
      connectionId,
      repository: z
        .string({ required_error: 'Choose a repository' })
        .regex(REPOSITORY, 'Choose a repository ("owner/name")'),
    })
    .strict(),
  'slack.sendMessage': z
    .object({
      connectionId,
      channelId: z
        .string({ required_error: 'Choose a channel' })
        .regex(SLACK_CHANNEL, 'Choose a channel'),
      text: z
        .string({ required_error: 'Enter the message' })
        .min(1, 'Enter the message')
        .max(LIMITS.slackText, `At most ${LIMITS.slackText} characters`),
      allowBroadcastMentions: z.boolean().default(false),
    })
    .strict(),
  'microsoft.todo.createTask': z
    .object({
      connectionId,
      listId: z.string({ required_error: 'Choose a list' }).regex(TODO_LIST_ID, 'Choose a list'),
      title: z
        .string({ required_error: 'Enter a title' })
        .min(1, 'Enter a title')
        .max(LIMITS.todoTitle, `At most ${LIMITS.todoTitle} characters`),
      body: z.string().max(LIMITS.todoBody, `At most ${LIMITS.todoBody} characters`).optional(),
      dueDate: z.string().max(LIMITS.dueDate).optional(),
    })
    .strict(),
  'ai.summarize': z
    .object({
      text: aiText,
      maxWords: z
        .number({ invalid_type_error: 'Enter a number' })
        .int('Use a whole number')
        .min(LIMITS.summarizeWords.min, `At least ${LIMITS.summarizeWords.min}`)
        .max(LIMITS.summarizeWords.max, `At most ${LIMITS.summarizeWords.max}`)
        .default(LIMITS.summarizeWords.default),
    })
    .strict(),
  'ai.classify': z
    .object({
      text: aiText,
      labels: z
        .array(z.string().trim().min(1).max(LIMITS.classifyLabels.length), {
          required_error: 'Add at least two labels',
        })
        .min(LIMITS.classifyLabels.min, 'Add at least two labels')
        .max(LIMITS.classifyLabels.max, `At most ${LIMITS.classifyLabels.max} labels`)
        .refine(uniqueIgnoringCase, 'Labels must be unique'),
      field: z.string().trim().min(1).max(LIMITS.classifyField).optional(),
    })
    .strict(),
  'ai.extract': z
    .object({
      text: aiText,
      fields: z
        .array(extractFieldSchema, { required_error: 'Add at least one field' })
        .min(LIMITS.extractFields.min, 'Add at least one field')
        .max(LIMITS.extractFields.max, `At most ${LIMITS.extractFields.max} fields`)
        .refine(
          (fields) => uniqueIgnoringCase(fields.map((f) => f.name)),
          'Field names must be unique',
        ),
    })
    .strict(),
};

/**
 * Client validation of a node's config: issue path ("text", "labels", "fields.1.name") →
 * first message. Unknown types are not checked here (the backend reports them).
 */
export function configErrors(type: string, config: unknown): Record<string, string> {
  const schema = CONFIG_SCHEMAS[type];
  if (!schema) return {};
  const result = schema.safeParse(config);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] ??= issue.message;
  }
  return errors;
}

/** Shown where users might expect to paste a credential (the backend rejects secrets in config). */
export const SECRET_HINT =
  'Never paste tokens or passwords here — connections hold credentials, and steps refer to them.';
