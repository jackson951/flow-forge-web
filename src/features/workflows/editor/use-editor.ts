import { useCallback, useEffect, useReducer } from 'react';
import { useBlocker } from 'react-router';
import type { WorkflowDefinition } from '../types/workflow-definition';
import { editorReducer, initialEditorState, isDirty, type EditorAction } from './editor-reducer';

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Editor state + the page-level behaviour around it (Part 05): keyboard shortcuts
 * (Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Ctrl/Cmd+S save) and a warning before
 * leaving with unsaved changes — both for closing the tab and for in-app navigation.
 */
export function useEditor(definition: WorkflowDefinition, onSave: () => void) {
  const [state, dispatch] = useReducer(editorReducer, definition, initialEditorState);
  const dirty = isDirty(state);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        onSave();
        return;
      }
      // Text fields keep their own undo.
      if (isTypingTarget(event.target)) return;
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: 'undo' });
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        dispatch({ type: 'redo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const act = useCallback((action: EditorAction) => dispatch(action), []);
  return { state, dispatch: act, dirty, blocker };
}
