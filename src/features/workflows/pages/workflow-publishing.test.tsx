import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import {
  version as versionFixture,
  WORKFLOW_ID,
  workflowDetail,
  workspaces,
  WS_ID,
} from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { ValidationIssue, WorkspaceRole } from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';

const DETAIL = `${API}/workspaces/${WS_ID}/workflows/${WORKFLOW_ID}`;
const URL_ = `/w/${WS_ID}/workflows/${WORKFLOW_ID}`;
const draft = workflowDetail.draftDefinition;

const withNode = (key: string): WorkflowDefinition => ({
  ...draft,
  nodes: [
    ...draft.nodes,
    { key, kind: 'ACTION', type: 'util.log', config: { message: key }, position: { x: 0, y: 320 } },
  ],
  edges: [...draft.edges, { from: 'log', to: key }],
});

function recordSaves(
  respond: (body: { expectedRevision: number }) => Response | undefined = () => undefined,
) {
  const bodies: { expectedRevision: number; definition: WorkflowDefinition }[] = [];
  server.use(
    http.put(`${DETAIL}/draft`, async ({ request }) => {
      const body = (await request.json()) as (typeof bodies)[number];
      bodies.push(body);
      return (
        respond(body) ?? HttpResponse.json({ draftRevision: body.expectedRevision + 1, issues: [] })
      );
    }),
  );
  return bodies;
}

/** The active version (v2) differs from the draft, so there is something to publish. */
const activeDiffers = () =>
  server.use(
    http.get(`${DETAIL}/versions/:version`, ({ params }) =>
      HttpResponse.json({
        ...versionFixture,
        version: Number(params.version),
        definition: withNode('old_step'),
      }),
    ),
  );

const asRole = (role: WorkspaceRole) =>
  server.use(
    http.get(`${API}/workspaces`, () =>
      HttpResponse.json(workspaces.map((w) => (w.id === WS_ID ? { ...w, role } : w))),
    ),
  );

const open = async (path = URL_) => {
  const result = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: workflowDetail.name }, { timeout: 30_000 });
  return result;
};
const palette = () => screen.getByRole('navigation', { name: 'Steps you can add' });
const addLog = async () =>
  userEvent.click(await within(palette()).findByRole('button', { name: /Log a message/ }));
const publishButton = () => screen.getByRole('button', { name: 'Publish' });
const blockedReason = () => document.getElementById('publish-blocked')?.textContent;
const canvasNode = (key: string) => document.querySelector(`.react-flow__node[data-id="${key}"]`);

// The editor route is lazy; load it once up front so the first test's wait is not spent
// transforming React Flow on a slow machine.
beforeAll(
  () => import('./workflow-editor-page').then(() => import('./workflow-version-page')),
  180_000,
);

describe('drafts, validation and publishing (Part 07)', () => {
  it('autosaves about 2 s after the last edit (FR-07.1, AC-07.1)', async () => {
    const saves = recordSaves();
    await open();
    await addLog();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(saves).toHaveLength(0);
    await waitFor(() => expect(saves).toHaveLength(1), { timeout: 6_000 });
    expect(saves[0].expectedRevision).toBe(workflowDetail.draftRevision);
    expect(saves[0].definition.nodes).toHaveLength(3);
    expect(await screen.findByText(/^Saved at/)).toBeInTheDocument();
    expect(
      screen.getByText(`Draft revision ${workflowDetail.draftRevision + 1}`),
    ).toBeInTheDocument();
  });

  it('a conflicting save stops autosave and offers "Reload theirs" (FR-07.2, AC-07.2)', async () => {
    const saves = recordSaves(() =>
      apiError(409, 'The draft was changed since you loaded it', {
        details: { currentRevision: 9 },
      }),
    );
    await open();
    await addLog();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const dialog = await screen.findByRole('dialog', { name: 'This draft changed elsewhere' });
    expect(screen.getByText('Changed elsewhere')).toBeInTheDocument();
    expect(saves).toHaveLength(1);

    server.use(
      http.get(DETAIL, () =>
        HttpResponse.json({
          ...workflowDetail,
          draftRevision: 9,
          draftDefinition: withNode('theirs'),
        }),
      ),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reload theirs' }));
    await waitFor(() => expect(canvasNode('theirs')).toBeInTheDocument());
    expect(screen.getByText(/Your local changes were discarded/)).toBeInTheDocument();
    expect(screen.getByText('Draft revision 9')).toBeInTheDocument();
    expect(saves).toHaveLength(1); // never sent over their draft
  });

  it('"Overwrite" re-saves the local draft on top of the current revision', async () => {
    let conflictOnce = true;
    const saves = recordSaves(() => {
      if (!conflictOnce) return undefined;
      conflictOnce = false;
      return apiError(409, 'stale', { details: { currentRevision: 9 } });
    });
    server.use(http.get(DETAIL, () => HttpResponse.json({ ...workflowDetail, draftRevision: 9 })));
    await open();
    await addLog();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const dialog = await screen.findByRole('dialog', { name: 'This draft changed elsewhere' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Overwrite' }));
    await waitFor(() => expect(saves).toHaveLength(2));
    expect(saves[1].expectedRevision).toBe(9);
    expect(saves[1].definition.nodes).toHaveLength(3);
    expect(await screen.findByText(/^Saved at/)).toBeInTheDocument();
  });

  it('lists every issue, workflow-level apart, and selects the step of an issue (FR-07.3, AC-07.3)', async () => {
    const issues: ValidationIssue[] = [
      {
        code: 'UNREACHABLE_NODE',
        severity: 'error',
        message: 'Step "orphan" can never run',
        nodeKey: 'orphan',
      },
      { code: 'CYCLE', severity: 'error', message: 'The graph contains a cycle' },
      {
        code: 'INVALID_NODE_CONFIG',
        severity: 'error',
        message: 'message is required',
        nodeKey: 'log',
        path: 'message',
      },
      {
        code: 'NON_ANCESTOR_REFERENCE',
        severity: 'warning',
        message: 'refers to a later step',
        nodeKey: 'log',
      },
    ];
    recordSaves((b) => HttpResponse.json({ draftRevision: b.expectedRevision + 1, issues }));
    await open();
    await addLog();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(await screen.findByRole('button', { name: '4 issues' }));
    const panel = screen.getByRole('region', { name: 'Validation issues' });
    // Unknown step keys and graph issues are listed under "Workflow".
    expect(within(panel).getByText('The graph contains a cycle')).toBeInTheDocument();
    expect(within(panel).getByText('Step "orphan" can never run')).toBeInTheDocument();
    expect(within(panel).getByText('refers to a later step')).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'Show step log: 2 issues' }));
    const side = screen.getByRole('complementary', { name: 'Selected step' });
    expect(await within(side).findByDisplayValue('log')).toBeInTheDocument();
    expect(within(side).getAllByText('message is required').length).toBeGreaterThan(0);
  });

  it('publish is blocked with a reason: nothing changed, unsaved changes, errors (FR-07.4, AC-07.5)', async () => {
    recordSaves((b) =>
      HttpResponse.json({
        draftRevision: b.expectedRevision + 1,
        issues: [
          { code: 'INVALID_NODE_CONFIG', severity: 'error', message: 'bad', nodeKey: 'log' },
        ],
      }),
    );
    await open();
    await waitFor(() => expect(blockedReason()).toBe('Nothing to publish: the draft matches v2.'));
    expect(publishButton()).toBeDisabled();
    expect(screen.getByText('Draft matches the active v2')).toBeInTheDocument();
    await addLog();
    expect(blockedReason()).toBe('Save your changes before publishing.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(blockedReason()).toBe('Fix 1 error before publishing.'));
    expect(publishButton()).toBeDisabled();
  });

  it('members cannot publish', async () => {
    asRole('MEMBER');
    activeDiffers();
    await open();
    await waitFor(() => expect(blockedReason()).toBe('Only owners and admins can publish.'));
    expect(publishButton()).toBeDisabled();
  });

  it('archived workflows cannot be published', async () => {
    server.use(
      http.get(DETAIL, () => HttpResponse.json({ ...workflowDetail, status: 'ARCHIVED' })),
    );
    await open();
    expect(blockedReason()).toBe('Archived workflows cannot be published.');
  });

  it('publishes after confirming what changes, and shows the new version (AC-07.4)', async () => {
    activeDiffers();
    const publishes: unknown[] = [];
    server.use(
      http.post(`${DETAIL}/publish`, async ({ request }) => {
        publishes.push(await request.json());
        return HttpResponse.json(
          { ...versionFixture, version: 3, isActive: true },
          { status: 201 },
        );
      }),
    );
    await open();
    await waitFor(() => expect(publishButton()).toBeEnabled());
    expect(screen.getByText('Draft has changes not in v2')).toBeInTheDocument();
    await userEvent.click(publishButton());
    const dialog = screen.getByRole('dialog', { name: 'Publish a new version?' });
    expect(within(dialog).getByText(/Webhook triggers are re-routed/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByText('Published v3. It is now the active version.'),
    ).toBeInTheDocument();
    expect(publishes).toEqual([{ expectedRevision: workflowDetail.draftRevision }]);
  });

  it('a 422 on publish shows the backend issues', async () => {
    activeDiffers();
    server.use(
      http.post(`${DETAIL}/publish`, () =>
        apiError(422, 'The draft uses integrations that are not connected in this workspace', {
          details: [
            {
              code: 'CONNECTION_INVALID',
              severity: 'error',
              nodeKey: 'log',
              message: 'No SLACK connection with this id in this workspace',
            },
          ],
        }),
      ),
    );
    await open();
    await waitFor(() => expect(publishButton()).toBeEnabled());
    await userEvent.click(publishButton());
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' }),
    );
    expect(await screen.findByText(/cannot be published yet/)).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Validation issues' });
    expect(
      within(panel).getByText('No SLACK connection with this id in this workspace'),
    ).toBeInTheDocument();
  });

  it('lists versions and restores one into the draft (FR-07.5)', async () => {
    activeDiffers();
    const saves = recordSaves();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Versions' }));
    const side = screen.getByRole('complementary', { name: 'Versions panel' });
    expect(await within(side).findByText('v2')).toBeInTheDocument();
    expect(within(side).getByText('Active')).toBeInTheDocument();
    expect(within(side).getByRole('link', { name: 'Open version 2' })).toHaveAttribute(
      'href',
      `${URL_}/versions/2`,
    );
    await userEvent.click(
      within(side).getByRole('button', { name: 'Restore version 2 into the draft' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Restore v2 into the draft?' })).getByRole(
        'button',
        { name: 'Restore' },
      ),
    );
    await waitFor(() => expect(canvasNode('old_step')).toBeInTheDocument());
    expect(screen.getByText(/Restored v2 into the draft/)).toBeInTheDocument();
    await waitFor(() => expect(saves).toHaveLength(1), { timeout: 6_000 });
    expect(saves[0].definition.nodes.map((n) => n.key)).toContain('old_step');
  });

  it('opens a version read-only, and "Restore into draft" goes back to the editor with it', async () => {
    activeDiffers();
    const { router } = renderRoute(`${URL_}/versions/2`);
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: `${workflowDetail.name} · v2` },
        { timeout: 30_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Published versions cannot be changed/)).toBeInTheDocument();
    await waitFor(() => expect(canvasNode('old_step')).toBeInTheDocument());
    fireEvent.click(canvasNode('old_step')!);
    expect(await screen.findByRole('textbox', { name: 'Step key' })).toHaveValue('old_step');
    expect(screen.getByRole('textbox', { name: 'Step key' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Restore into draft' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(URL_));
    expect(
      await screen.findByText(/Restored v2 into the draft/, {}, { timeout: 30_000 }),
    ).toBeInTheDocument();
  });

  it('both side panels collapse to a rail and expand again, remembered in this browser', async () => {
    localStorage.removeItem('flowforge.editor.panels');
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse steps panel' }));
    expect(screen.queryByRole('navigation', { name: 'Steps you can add' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse side panel' }));
    expect(screen.queryByText('Select a step')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('flowforge.editor.panels')!)).toEqual({
      left: false,
      right: false,
    });

    // Showing versions opens the right panel again.
    await userEvent.click(screen.getByRole('button', { name: 'Versions' }));
    expect(screen.getByRole('complementary', { name: 'Versions panel' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand steps panel' }));
    expect(screen.getByRole('navigation', { name: 'Steps you can add' })).toBeInTheDocument();
    localStorage.removeItem('flowforge.editor.panels');
  });
});
