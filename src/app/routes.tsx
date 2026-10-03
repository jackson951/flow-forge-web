import type { RouteObject } from 'react-router';
import { RouteError } from '@/components/feedback/route-error';
import { AppShell } from '@/components/layout/app-shell';
import { AuthLayout } from '@/components/layout/auth-layout';
import { RedirectIfAuthenticated } from '@/features/auth/components/redirect-if-authenticated';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { IntegrationsPage } from '@/features/integrations/pages/integrations-page';
import { RunDetailPage } from '@/features/runs/pages/run-detail-page';
import { RunsListPage } from '@/features/runs/pages/runs-list-page';
import { GeneralSettingsPage } from '@/features/settings/pages/general-settings-page';
import { MembersPage } from '@/features/settings/pages/members-page';
import { SettingsPage } from '@/features/settings/pages/settings-page';
import { WorkflowsListPage } from '@/features/workflows/pages/workflows-list-page';
import { WorkspaceGuard } from '@/features/workspaces/components/workspace-guard';
import { WorkspaceRedirect } from '@/features/workspaces/components/workspace-redirect';
import { patterns, paths } from '@/lib/routes';
import { NotFoundPage } from '@/pages/not-found-page';

export const routes: RouteObject[] = [
  {
    element: (
      <RedirectIfAuthenticated>
        <AuthLayout />
      </RedirectIfAuthenticated>
    ),
    errorElement: <RouteError />,
    children: [
      { path: paths.login, element: <LoginPage /> },
      { path: paths.register, element: <RegisterPage /> },
    ],
  },
  {
    path: paths.home,
    errorElement: <RouteError />,
    element: (
      <RequireAuth>
        <WorkspaceRedirect />
      </RequireAuth>
    ),
  },
  {
    // Every tenant page is under /w/:workspaceId (Part 01) and only renders for a workspace
    // the user belongs to (Part 03).
    path: patterns.workspace,
    element: (
      <RequireAuth>
        <WorkspaceGuard>
          <AppShell />
        </WorkspaceGuard>
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: patterns.workflows, element: <WorkflowsListPage /> },
      {
        path: patterns.workflow,
        // Code-split: React Flow only loads when the editor opens.
        lazy: () =>
          import('@/features/workflows/pages/workflow-editor-page').then((m) => ({
            Component: m.WorkflowEditorPage,
          })),
      },
      { path: patterns.runs, element: <RunsListPage /> },
      { path: patterns.run, element: <RunDetailPage /> },
      { path: patterns.integrations, element: <IntegrationsPage /> },
      {
        path: patterns.settings,
        element: <SettingsPage />,
        children: [
          { index: true, element: <GeneralSettingsPage /> },
          { path: patterns.settingsMembers, element: <MembersPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
