import { z } from 'zod';

/** CreateWorkflowDto / UpdateWorkflowDto: name trimmed 1–120, description ≤ 1000. */
export const workflowDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120, 'At most 120 characters'),
  description: z.string().trim().max(1000, 'At most 1000 characters'),
});
export type WorkflowDetailsInput = z.infer<typeof workflowDetailsSchema>;
