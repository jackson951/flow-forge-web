import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { DraftSaveResult } from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';
import { DraftSaver, type SendDraft } from './draft-saver';

/** Idle time after the last edit before the draft is saved automatically. */
export const AUTOSAVE_DELAY_MS = 2_000;

interface UseDraftSaverOptions {
  revision: number;
  initialDefinition: WorkflowDefinition;
  definition: WorkflowDefinition;
  dirty: boolean;
  /** Archived workflows and version views never save. */
  disabled: boolean;
  send: SendDraft;
  onSaved: (definition: WorkflowDefinition, result: DraftSaveResult) => void;
}

/**
 * The editor's connection to the save queue (Part 07): autosaves 2 s after the last edit,
 * `saveNow` for the Save button and Ctrl/Cmd+S. Autosave stops while there is a conflict.
 */
export function useDraftSaver({
  revision,
  initialDefinition,
  definition,
  dirty,
  disabled,
  send,
  onSaved,
}: UseDraftSaverOptions) {
  // Created once; the latest callbacks are handed to it after each render.
  const [saver] = useState(() => new DraftSaver(revision, initialDefinition, send, { onSaved }));
  useEffect(() => {
    saver.setHandlers(send, { onSaved });
  }, [saver, send, onSaved]);
  const snapshot = useSyncExternalStore(saver.subscribe, saver.getSnapshot);

  const latest = useRef(definition);
  useEffect(() => {
    latest.current = definition;
  }, [definition]);

  const blocked = disabled || snapshot.status === 'conflict';
  useEffect(() => {
    if (blocked || !dirty) return;
    const timer = setTimeout(() => void saver.save(latest.current), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [definition, dirty, blocked, saver]);

  const saveNow = useCallback(() => {
    if (disabled) return Promise.resolve();
    return saver.save(latest.current);
  }, [disabled, saver]);

  return { saver, snapshot, saveNow };
}
