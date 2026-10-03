import type { DraftSaveResult } from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';

/**
 * Saves the draft with optimistic concurrency (Part 07, FR-07.1/07.2). Pure — no React.
 *
 * - Never two saves at once: a save requested while one is in flight waits, and only the
 *   latest requested definition is sent afterwards ("latest wins").
 * - Each successful save returns the next revision, which the following save sends as
 *   `expectedRevision` (revision chaining).
 * - A 409 stale revision stops everything in `conflict` until the user chooses (reload theirs
 *   or overwrite); nothing is ever sent over someone else's newer draft silently.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict';

export interface SaveSnapshot {
  status: SaveStatus;
  /** Revision the next save will send as expectedRevision. */
  revision: number;
  /** The definition as last stored by the backend. */
  savedDefinition: WorkflowDefinition;
  savedAt: Date | null;
  error: unknown;
  /** Revision the backend reported on conflict, when known. */
  conflictRevision: number | null;
}

export type SendDraft = (
  revision: number,
  definition: WorkflowDefinition,
) => Promise<DraftSaveResult>;

export interface SaverEvents {
  onSaved?: (definition: WorkflowDefinition, result: DraftSaveResult) => void;
}

/** 409 with `details.currentRevision` (draft changed elsewhere). */
export function conflictRevisionOf(error: unknown): number | null | undefined {
  const e = error as { status?: number; details?: { currentRevision?: unknown } } | null;
  if (e?.status !== 409) return undefined;
  const current = e.details?.currentRevision;
  return typeof current === 'number' ? current : null;
}

export class DraftSaver {
  private snapshot: SaveSnapshot;
  private inFlight: Promise<void> | null = null;
  private queued: WorkflowDefinition | null = null;
  private listeners = new Set<() => void>();

  constructor(
    revision: number,
    savedDefinition: WorkflowDefinition,
    private send: SendDraft,
    private events: SaverEvents = {},
  ) {
    this.snapshot = {
      status: 'idle',
      revision,
      savedDefinition,
      savedAt: null,
      error: null,
      conflictRevision: null,
    };
  }

  getSnapshot = () => this.snapshot;

  /** Swaps in the latest send/onSaved callbacks (React re-creates them on render). */
  setHandlers(send: SendDraft, events: SaverEvents) {
    this.send = send;
    this.events = events;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<SaveSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Requests a save of `definition`. Resolves when it (or a later one replacing it) settled. */
  save(definition: WorkflowDefinition): Promise<void> {
    if (this.snapshot.status === 'conflict') return Promise.resolve();
    if (this.inFlight) {
      this.queued = definition;
      return this.inFlight;
    }
    this.inFlight = this.run(definition).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async run(first: WorkflowDefinition): Promise<void> {
    let next: WorkflowDefinition | null = first;
    while (next) {
      const definition: WorkflowDefinition = next;
      this.queued = null;
      this.set({ status: 'saving', error: null });
      try {
        const result = await this.send(this.snapshot.revision, definition);
        this.set({
          status: 'saved',
          revision: result.draftRevision,
          savedDefinition: definition,
          savedAt: new Date(),
        });
        this.events.onSaved?.(definition, result);
      } catch (error) {
        const conflict = conflictRevisionOf(error);
        this.queued = null;
        if (conflict !== undefined) {
          this.set({ status: 'conflict', error, conflictRevision: conflict });
        } else {
          this.set({ status: 'failed', error });
        }
        return;
      }
      next = this.queued;
    }
  }

  /** "Reload theirs": adopt the server's draft as the new baseline. */
  reset(revision: number, savedDefinition: WorkflowDefinition) {
    this.queued = null;
    this.set({ status: 'idle', revision, savedDefinition, error: null, conflictRevision: null });
  }

  /** "Overwrite": continue from the server's current revision and save `definition` over it. */
  overwrite(revision: number, definition: WorkflowDefinition): Promise<void> {
    this.set({ status: 'idle', revision, error: null, conflictRevision: null });
    return this.save(definition);
  }

  /** A save is in flight. */
  get busy() {
    return this.inFlight !== null;
  }
}
