import { describe, expect, it } from 'vitest';
import type { WorkflowDefinition } from '../types/workflow-definition';
import { executionDepths, maximumStepsPerRun } from './graph-metrics';

describe('workflow execution metrics', () => {
  it('counts alternative condition branches as one possible execution level', () => {
    const definition: WorkflowDefinition = {
      schemaVersion: 1,
      nodes: [
        { key: 'trigger', kind: 'TRIGGER', type: 'manual.trigger', config: {} },
        { key: 'condition', kind: 'CONDITION', type: 'condition', config: {} },
        { key: 'yes', kind: 'ACTION', type: 'util.log', config: {} },
        { key: 'no', kind: 'ACTION', type: 'util.log', config: {} },
      ],
      edges: [
        { from: 'trigger', to: 'condition' },
        { from: 'condition', to: 'yes', branch: 'true' },
        { from: 'condition', to: 'no', branch: 'false' },
      ],
    };

    expect(definition.nodes).toHaveLength(4);
    expect(maximumStepsPerRun(definition)).toBe(3);
    expect(executionDepths(definition).get('yes')).toBe(2);
    expect(executionDepths(definition).get('no')).toBe(2);
  });
});
