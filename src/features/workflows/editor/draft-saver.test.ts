import type { DraftSaveResult } from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';
import { conflictRevisionOf, DraftSaver } from './draft-saver';

const def = (n: number): WorkflowDefinition => ({
  schemaVersion: 1,
  nodes: [{ key: `n${n}`, kind: 'TRIGGER', type: 'manual.trigger', config: {} }],
  edges: [],
});

/** A send() whose calls stay pending until the test resolves or rejects them. */
function controlledSend() {
  const calls: {
    revision: number;
    definition: WorkflowDefinition;
    resolve: (r: DraftSaveResult) => void;
    reject: (e: unknown) => void;
  }[] = [];
  let active = 0;
  let maxActive = 0;
  const send = (revision: number, definition: WorkflowDefinition) =>
    new Promise<DraftSaveResult>((resolve, reject) => {
      active++;
      maxActive = Math.max(maxActive, active);
      const done =
        <T>(f: (v: T) => void) =>
        (v: T) => {
          active--;
          f(v);
        };
      calls.push({ revision, definition, resolve: done(resolve), reject: done(reject) });
    });
  return { send, calls, maxActive: () => maxActive };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const ok = (draftRevision: number): DraftSaveResult => ({ draftRevision, issues: [] });

describe('DraftSaver (Part 07, FR-07.1/07.2)', () => {
  it('sends the revision and chains the next one', async () => {
    const { send, calls } = controlledSend();
    const saver = new DraftSaver(3, def(0), send);
    const first = saver.save(def(1));
    expect(saver.getSnapshot().status).toBe('saving');
    calls[0].resolve(ok(4));
    await first;
    expect(saver.getSnapshot()).toMatchObject({
      status: 'saved',
      revision: 4,
      savedDefinition: def(1),
    });
    void saver.save(def(2));
    expect(calls[1].revision).toBe(4);
  });

  it('never overlaps saves and sends only the latest queued definition', async () => {
    const { send, calls, maxActive } = controlledSend();
    const saver = new DraftSaver(1, def(0), send);
    const done = saver.save(def(1));
    void saver.save(def(2));
    void saver.save(def(3)); // replaces def(2)
    expect(calls).toHaveLength(1);
    calls[0].resolve(ok(2));
    await flush();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ revision: 2, definition: def(3) });
    calls[1].resolve(ok(3));
    await done;
    expect(maxActive()).toBe(1);
    expect(saver.getSnapshot()).toMatchObject({
      status: 'saved',
      revision: 3,
      savedDefinition: def(3),
    });
  });

  it('reports each stored definition with the issues', async () => {
    const saved: unknown[] = [];
    const { send, calls } = controlledSend();
    const saver = new DraftSaver(1, def(0), send, { onSaved: (d, r) => saved.push([d, r.issues]) });
    const p = saver.save(def(1));
    calls[0].resolve({
      draftRevision: 2,
      issues: [{ code: 'NO_TRIGGER', severity: 'error', message: 'x' }],
    });
    await p;
    expect(saved).toEqual([[def(1), [{ code: 'NO_TRIGGER', severity: 'error', message: 'x' }]]]);
  });

  it('a 409 stops in conflict, drops the queue and refuses further saves until resolved', async () => {
    const { send, calls } = controlledSend();
    const saver = new DraftSaver(5, def(0), send);
    const p = saver.save(def(1));
    void saver.save(def(2));
    calls[0].reject({ status: 409, details: { currentRevision: 7 } });
    await p;
    expect(saver.getSnapshot()).toMatchObject({
      status: 'conflict',
      conflictRevision: 7,
      revision: 5,
    });
    await saver.save(def(3));
    expect(calls).toHaveLength(1); // nothing sent over the newer draft
  });

  it('"Overwrite" continues from the server revision; "Reload theirs" adopts their draft', async () => {
    const { send, calls } = controlledSend();
    const saver = new DraftSaver(5, def(0), send);
    const p = saver.save(def(1));
    calls[0].reject({ status: 409, details: { currentRevision: 7 } });
    await p;
    const o = saver.overwrite(7, def(1));
    expect(calls[1]).toMatchObject({ revision: 7, definition: def(1) });
    calls[1].resolve(ok(8));
    await o;
    expect(saver.getSnapshot()).toMatchObject({ status: 'saved', revision: 8 });

    saver.reset(10, def(9));
    expect(saver.getSnapshot()).toMatchObject({
      status: 'idle',
      revision: 10,
      savedDefinition: def(9),
    });
  });

  it('other errors leave the revision alone so the next save can retry', async () => {
    const { send, calls } = controlledSend();
    const saver = new DraftSaver(2, def(0), send);
    const p = saver.save(def(1));
    calls[0].reject({ status: 500 });
    await p;
    expect(saver.getSnapshot()).toMatchObject({
      status: 'failed',
      revision: 2,
      savedDefinition: def(0),
    });
    void saver.save(def(1));
    expect(calls[1].revision).toBe(2);
  });

  it('recognises the backend conflict shape', () => {
    expect(conflictRevisionOf({ status: 409, details: { currentRevision: 4 } })).toBe(4);
    expect(conflictRevisionOf({ status: 409 })).toBeNull();
    expect(conflictRevisionOf({ status: 422 })).toBeUndefined();
  });
});
