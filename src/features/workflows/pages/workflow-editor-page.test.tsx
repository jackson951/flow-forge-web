import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { WORKFLOW_ID, workflowDetail, WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { WorkflowDefinition } from '../types/workflow-definition';

const DETAIL = `${API}/workspaces/${WS_ID}/workflows/${WORKFLOW_ID}`;
const URL_ = `/w/${WS_ID}/workflows/${WORKFLOW_ID}`;

/** Records the bodies of draft saves; responds with the next revision and `issues`. */
function recordSaves(issues: unknown[] = []) {
  const bodies: { expectedRevision: number; definition: WorkflowDefinition }[] = [];
  server.use(
    http.put(`${DETAIL}/draft`, async ({ request }) => {
      const body = (await request.json()) as (typeof bodies)[number];
      bodies.push(body);
      return HttpResponse.json({ draftRevision: body.expectedRevision + 1, issues });
    }),
  );
  return bodies;
}

const openEditor = async (path = URL_) => {
  const result = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: workflowDetail.name }, { timeout: 10_000 });
  return result;
};

const palette = () => screen.getByRole('navigation', { name: 'Steps you can add' });
const panel = () => screen.getByRole('complementary', { name: 'Selected step' });
const canvasNode = (key: string) =>
  document.querySelector<HTMLElement>(`.react-flow__node[data-id="${key}"]`)!;

/**
 * Selects a node with a click event only: d3-drag's mousedown handler needs `event.view`,
 * which user-event's synthetic events lack in jsdom. Dragging is checked in the browser.
 */
const selectNode = (key: string) => fireEvent.click(canvasNode(key));

describe('Workflow editor canvas (Part 05)', () => {
  it('opens the saved draft on the canvas', async () => {
    await openEditor();
    expect(canvasNode('trigger')).toBeInTheDocument();
    expect(canvasNode('log')).toBeInTheDocument();
    expect(within(canvasNode('log')).getByText('Log a message')).toBeInTheDocument();
    expect(screen.getByText('2/50 steps')).toBeInTheDocument();
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(within(panel()).getByText('Select a step')).toBeInTheDocument();
  });

  it('offers only server node types and explains the ones that cannot be added', async () => {
    await openEditor();
    const nav = palette();
    // The draft already has a trigger; the AI step has no provider on this server.
    expect(await within(nav).findByRole('button', { name: /Manual trigger/ })).toBeDisabled();
    expect(within(nav).getByText(/A workflow has one trigger/)).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /AI: summarize text/ })).toBeDisabled();
    expect(within(nav).getByText(/No AI provider is configured/)).toBeInTheDocument();
    await userEvent.type(within(nav).getByRole('searchbox', { name: 'Search steps' }), 'cond');
    expect(within(nav).getByRole('button', { name: /Condition/ })).toBeEnabled();
    expect(within(nav).queryByRole('button', { name: /Log a message/ })).not.toBeInTheDocument();
  });

  it('adds a step after the selected one, connected, and saves the definition (AC-05.1)', async () => {
    const saves = recordSaves();
    await openEditor();
    selectNode('log');
    expect(await within(panel()).findByDisplayValue('log')).toBeInTheDocument();

    await userEvent.click(await within(palette()).findByRole('button', { name: /Condition/ }));
    expect(screen.getByText('3/50 steps')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    // The new step is selected.
    expect(within(panel()).getByDisplayValue('condition')).toBeInTheDocument();
    await waitFor(() => expect(canvasNode('condition')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].expectedRevision).toBe(workflowDetail.draftRevision);
    expect(saves[0].definition.nodes.map((n) => n.key)).toEqual(['trigger', 'log', 'condition']);
    expect(saves[0].definition.edges).toEqual([
      { from: 'trigger', to: 'log' },
      { from: 'log', to: 'condition' },
    ]);
    expect(await screen.findByText(/^Saved at/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sends the next revision on the following save', async () => {
    const saves = recordSaves();
    await openEditor();
    const nav = palette();
    await userEvent.click(await within(nav).findByRole('button', { name: /Log a message/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(/^Saved at/);
    await userEvent.click(within(nav).getByRole('button', { name: /Condition/ }));
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(saves).toHaveLength(2));
    expect(saves.map((s) => s.expectedRevision)).toEqual([
      workflowDetail.draftRevision,
      workflowDetail.draftRevision + 1,
    ]);
  });

  it('says when an added step is not connected (nothing selected)', async () => {
    await openEditor();
    await userEvent.click(await within(palette()).findByRole('button', { name: /Condition/ }));
    expect(await screen.findByText(/Added, but not connected/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/Added, but not connected/)).not.toBeInTheDocument();
  });

  it('undoes and redoes with the buttons and the keyboard (AC-05.3)', async () => {
    await openEditor();
    await userEvent.click(await within(palette()).findByRole('button', { name: /Log a message/ }));
    expect(screen.getByText('3/50 steps')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('2/50 steps')).toBeInTheDocument();
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByText('3/50 steps')).toBeInTheDocument();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(screen.getByText('2/50 steps')).toBeInTheDocument();
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(screen.getByText('3/50 steps')).toBeInTheDocument();
  });

  it('renames a step key and rewrites references to it', async () => {
    const saves = recordSaves();
    server.use(
      http.get(DETAIL, () =>
        HttpResponse.json({
          ...workflowDetail,
          draftDefinition: {
            ...workflowDetail.draftDefinition,
            nodes: [
              ...workflowDetail.draftDefinition.nodes,
              {
                key: 'second',
                kind: 'ACTION',
                type: 'util.log',
                config: { message: 'Before: {{steps.log.output.message}}' },
                position: { x: 0, y: 320 },
              },
            ],
            edges: [...workflowDetail.draftDefinition.edges, { from: 'log', to: 'second' }],
          },
        }),
      ),
    );
    await openEditor();
    selectNode('log');
    const key = await within(panel()).findByDisplayValue('log');
    await userEvent.clear(key);
    await userEvent.type(key, 'trigger');
    expect(within(panel()).getByText('Another step already uses this key')).toBeInTheDocument();
    await userEvent.clear(key);
    await userEvent.type(key, 'greet{Enter}');
    await waitFor(() => expect(canvasNode('greet')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saves).toHaveLength(1));
    const def = saves[0].definition;
    expect(def.edges).toEqual([
      { from: 'trigger', to: 'greet' },
      { from: 'greet', to: 'second' },
    ]);
    expect(def.nodes.find((n) => n.key === 'second')?.config).toEqual({
      message: 'Before: {{steps.greet.output.message}}',
    });
  });

  it('deletes the selected step and its edges from the panel', async () => {
    await openEditor();
    selectNode('log');
    await userEvent.click(await within(panel()).findByRole('button', { name: /Delete step/ }));
    await waitFor(() => expect(canvasNode('log')).toBeNull());
    expect(screen.getByText('1/50 steps')).toBeInTheDocument();
    expect(within(panel()).getByText('Select a step')).toBeInTheDocument();
  });

  it('marks steps with issues returned by the save', async () => {
    recordSaves([{ code: 'INVALID_CONFIG', message: 'message is required', nodeKey: 'log' }]);
    await openEditor();
    await userEvent.click(await within(palette()).findByRole('button', { name: /Condition/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(within(canvasNode('log')).getByText(/1 issue/i)).toBeInTheDocument(),
    );
    selectNode('log');
    expect(await within(panel()).findByText('message is required')).toBeInTheDocument();
  });

  it('explains a conflicting save and keeps the local changes', async () => {
    server.use(
      http.put(`${DETAIL}/draft`, () =>
        apiError(409, 'Draft revision is stale', { error: 'Conflict' }),
      ),
    );
    await openEditor();
    await userEvent.click(await within(palette()).findByRole('button', { name: /Condition/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/changed elsewhere/);
    expect(screen.getByText('Not saved')).toBeInTheDocument();
    expect(screen.getByText('3/50 steps')).toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    const { router } = await openEditor();
    await userEvent.click(await within(palette()).findByRole('button', { name: /Condition/ }));
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Workflows',
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Leave without saving?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(router.state.location.pathname).toBe(URL_);
    expect(screen.getByText('3/50 steps')).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Workflows',
      }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Leave and discard' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}/workflows`));
  });

  it('leaves without asking when there is nothing unsaved', async () => {
    const { router } = await openEditor();
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Workflows',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}/workflows`));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an archived workflow read-only', async () => {
    server.use(
      http.get(DETAIL, () => HttpResponse.json({ ...workflowDetail, status: 'ARCHIVED' })),
    );
    await openEditor();
    expect(screen.getByText(/archived and read-only/)).toBeInTheDocument();
    expect(await within(palette()).findByRole('button', { name: /Condition/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    selectNode('log');
    expect(await within(panel()).findByDisplayValue('log')).toBeDisabled();
    expect(within(panel()).queryByRole('button', { name: /Delete step/ })).not.toBeInTheDocument();
  });

  it('shows not found for a workflow of another workspace', async () => {
    server.use(http.get(DETAIL, () => apiError(404, 'Workflow not found', { error: 'Not Found' })));
    renderRoute(URL_);
    expect(
      await screen.findByText('Workflow not found', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });
});
