import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { useWorkspaces } from '../api/workspaces.api';
import { useWorkspace } from '../hooks/use-current-workspace';
import { ROLE_LABEL } from '../policy';
import { sameSectionIn } from '../same-section';
import { CreateWorkspaceDialog } from './create-workspace-dialog';

/** Workspace switcher at the bottom of the sidebar (Part 03, FR-03.1, FR-03.3). */
export function WorkspaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const current = useWorkspace();
  const workspaces = useWorkspaces();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      const outside =
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !ref.current?.contains(event.target as Node);
      if (outside) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const switchTo = (id: string) => {
    setOpen(false);
    if (id === current.id) return;
    // Requests still loading for the old workspace are dropped; its cache stays keyed by its id.
    void qc.cancelQueries({ queryKey: queryKeys.ws(current.id) });
    navigate(sameSectionIn(pathname, id));
    onNavigate?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Workspace: ${current.name}. Switch workspace`}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-sidebar-soft flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
      >
        <span className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{current.name}</span>
          <span className="text-sidebar-text block text-xs">{ROLE_LABEL[current.role]}</span>
        </span>
        <ChevronsUpDown className="text-sidebar-text size-4 shrink-0" aria-hidden />
      </button>

      {open && (
        <div className="border-line bg-surface text-ink absolute bottom-full left-0 z-50 mb-2 w-full min-w-56 rounded-lg border py-1 shadow-xl">
          <ul
            id={listId}
            role="listbox"
            aria-label="Your workspaces"
            className="max-h-72 overflow-y-auto"
          >
            {(workspaces.data ?? []).map((w) => (
              <li
                key={w.id}
                role="option"
                aria-selected={w.id === current.id}
                tabIndex={0}
                onClick={() => switchTo(w.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    switchTo(w.id);
                  }
                }}
                className={cn(
                  'hover:bg-canvas flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                  w.id === current.id && 'font-medium',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span className="text-muted text-xs">{ROLE_LABEL[w.role]}</span>
                {w.id === current.id && <Check className="text-primary size-4" aria-hidden />}
              </li>
            ))}
          </ul>
          <div className="border-line mt-1 border-t pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="text-primary hover:bg-canvas flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
            >
              <Plus className="size-4" aria-hidden />
              Create workspace
            </button>
          </div>
        </div>
      )}
      <CreateWorkspaceDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
