import type { RouteObject } from 'react-router';
import { RouteError } from '@/components/feedback/route-error';
import { AppShell } from '@/components/layout/app-shell';
import { AuthLayout } from '@/components/layout/auth-layout';
import { RedirectIfAuthenticated } from '@/features/auth/components/redirect-if-authenticated';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { FeaturesPage, SecurityPage } from '@/features/marketing/info-pages';
import { HomeGate, IntegrationsEntry } from '@/features/marketing/public-entry';
import { PublicLayout } from '@/features/marketing/public-layout';
import { RunsListPage } from '@/features/runs/pages/runs-list-page';
import { AccountSettingsPage } from '@/features/settings/pages/account-settings-page';
import { DangerZonePage } from '@/features/settings/pages/danger-zone-page';
import { GeneralSettingsPage } from '@/features/settings/pages/general-settings-page';
import { MembersPage } from '@/features/settings/pages/members-page';
import { SettingsPage } from '@/features/settings/pages/settings-page';
import { WorkflowsListPage } from '@/features/workflows/pages/workflows-list-page';
import { WorkspaceGuard } from '@/features/workspaces/components/workspace-guard';
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
    // Public homepage when signed out; the user's workspace when signed in (Part 12).
    path: paths.home,
    errorElement: <RouteError />,
    element: <HomeGate />,
  },
  {
    // Public catalogue, or the backend's integration callback (Part 10) when it has ?status=.
    path: paths.integrationCallback,
    errorElement: <RouteError />,
    element: <IntegrationsEntry />,
  },
  {
    // Public website (Part 12).
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: paths.features, element: <FeaturesPage /> },
      { path: paths.security, element: <SecurityPage /> },
    ],
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
      {
        path: patterns.workflowVersion,
        lazy: () =>
          import('@/features/workflows/pages/workflow-version-page').then((m) => ({
            Component: m.WorkflowVersionPage,
          })),
      },
      { path: patterns.runs, element: <RunsListPage /> },
      {
        path: patterns.run,
        // Code-split: the "path taken" canvas uses React Flow, which only loads on demand.
        lazy: () =>
          import('@/features/runs/pages/run-detail-page').then((m) => ({
            Component: m.RunDetailPage,
          })),
      },
      {
        path: patterns.integrations,
        // Code-split (Part 19): connection dialogs and provider catalogue load on demand.
        lazy: () =>
          import('@/features/integrations/pages/integrations-page').then((m) => ({
            Component: m.IntegrationsPage,
          })),
      },
      {
        path: patterns.settings,
        element: <SettingsPage />,
        children: [
          { index: true, element: <GeneralSettingsPage /> },
          { path: patterns.settingsMembers, element: <MembersPage /> },
          { path: patterns.settingsAccount, element: <AccountSettingsPage /> },
          { path: patterns.settingsDanger, element: <DangerZonePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
