import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { editorReducer, initialEditorState } from '../editor/editor-reducer';
import type { WorkflowDefinition } from '../types/workflow-definition';
import { NextSteps } from './next-steps';

const def: WorkflowDefinition = {
  schemaVersion: 1,
  nodes: [
    { key: 'trigger', kind: 'TRIGGER', type: 'manual.trigger', config: {} },
    { key: 'cond', kind: 'CONDITION', type: 'condition', config: {} },
    { key: 'yes', kind: 'ACTION', type: 'util.log', config: {} },
    { key: 'no', kind: 'ACTION', type: 'util.log', config: {} },
  ],
  edges: [{ from: 'trigger', to: 'cond' }],
};

function Harness({ nodeKey, onDef }: { nodeKey: string; onDef: (d: WorkflowDefinition) => void }) {
  const [state, dispatch] = useReducer(editorReducer, def, initialEditorState);
  onDef(state.definition);
  const node = state.definition.nodes.find((n) => n.key === nodeKey)!;
  return (
    <NextSteps
      node={node}
      definition={state.definition}
      labelFor={(t) => t}
      dispatch={dispatch}
      readOnly={false}
    />
  );
}

describe('Next steps: connecting without the mouse (Part 12, FR-12.5)', () => {
  it('connects a condition’s true and false branches from menus, and removes a connection', async () => {
    let current = def;
    render(<Harness nodeKey="cond" onDef={(d) => (current = d)} />);
    // Only valid targets: not itself, not the trigger.
    const target = screen.getByLabelText('Connect to');
    expect([...target.querySelectorAll('option')].map((o) => o.value)).toEqual(['', 'yes', 'no']);
    await userEvent.selectOptions(target, 'yes');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(current.edges).toContainEqual({ from: 'cond', to: 'yes', branch: 'true' });
    // The next free branch is offered automatically.
    expect(screen.getByLabelText('Branch')).toHaveValue('false');
    await userEvent.selectOptions(screen.getByLabelText('Connect to'), 'no');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(current.edges).toContainEqual({ from: 'cond', to: 'no', branch: 'false' });
    expect(screen.queryByLabelText('Connect to')).not.toBeInTheDocument(); // both branches used
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect no' }));
    expect(current.edges).not.toContainEqual({ from: 'cond', to: 'no', branch: 'false' });
  });

  it('offers only steps that would not create a cycle', () => {
    render(<Harness nodeKey="yes" onDef={() => undefined} />);
    const options = [...screen.getByLabelText('Connect to').querySelectorAll('option')].map(
      (o) => o.value,
    );
    expect(options).not.toContain('trigger');
    expect(options).not.toContain('yes');
  });
});
