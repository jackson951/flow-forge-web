import { createContext } from 'react';
import type { Workspace } from '@/types/api';

/** The workspace WorkspaceGuard resolved; set only while its pages are rendered. */
export const WorkspaceContext = createContext<Workspace | null>(null);
