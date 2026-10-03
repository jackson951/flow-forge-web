import { z } from 'zod';

/** CreateWorkspaceDto / UpdateWorkspaceDto: trimmed, 1–100 characters. */
export const workspaceNameSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(100, 'At most 100 characters'),
});
export type WorkspaceNameInput = z.infer<typeof workspaceNameSchema>;
