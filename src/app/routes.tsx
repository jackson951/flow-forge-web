import type { RouteObject } from 'react-router';
import { RouteError } from '@/components/feedback/route-error';
import { AppShell } from '@/components/layout/app-shell';
import { AuthLayout } from '@/components/layout/auth-layout';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { IntegrationsPage } from '@/features/integrations/pages/integrations-page';
import { RunDetailPage } from '@/features/runs/pages/run-detail-page';
import { RunsListPage } from '@/features/runs/pages/runs-list-page';
import { SettingsPage } from '@/features/settings/pages/settings-page';
import { WorkflowsListPage } from '@/features/workflows/pages/workflows-list-page';
import { NotFoundPage } from '@/pages/not-found-page';

export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: '/workflows', element: <WorkflowsListPage /> },
      {
        path: '/workflows/:workflowId',
        // Code-split: React Flow only loads when the editor opens.
        lazy: () =>
          import('@/features/workflows/pages/workflow-editor-page').then((m) => ({
            Component: m.WorkflowEditorPage,
          })),
      },
      { path: '/runs', element: <RunsListPage /> },
      { path: '/runs/:runId', element: <RunDetailPage /> },
      { path: '/integrations', element: <IntegrationsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
