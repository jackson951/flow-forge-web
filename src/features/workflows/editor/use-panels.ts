import { useCallback, useState } from 'react';

const STORAGE_KEY = 'flowforge.editor.panels';

export interface PanelState {
  left: boolean;
  right: boolean;
}

function read(): PanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PanelState>) : {};
    return { left: parsed.left !== false, right: parsed.right !== false };
  } catch {
    return { left: true, right: true };
  }
}

/**
 * Which editor side panels are open (step list on the left, step/versions on the right).
 * A per-browser convenience: remembered in localStorage when available, open by default.
 */
export function usePanels() {
  const [panels, setPanels] = useState<PanelState>(read);
  const set = useCallback((side: keyof PanelState, open: boolean) => {
    setPanels((current) => {
      const next = { ...current, [side]: open };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode, blocked): the choice lasts for this page only.
      }
      return next;
    });
  }, []);
  return { panels, setPanel: set };
}
