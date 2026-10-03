import { createContext, useContext } from 'react';
import type { ReferenceProblem, ReferenceSuggestion } from './references';

/** What the selected step's form needs to know about the rest of the workflow. */
export interface ConfigScope {
  /** Data this step may reference (upstream only). */
  suggestions: ReferenceSuggestion[];
  /** Checks a reference used in this step. */
  problem: (ref: string) => ReferenceProblem | null;
  readOnly: boolean;
  /** The step being configured (to come back to it after connecting an integration). */
  nodeKey?: string;
}

export const ConfigScopeContext = createContext<ConfigScope>({
  suggestions: [],
  problem: () => null,
  readOnly: false,
});

export const useConfigScope = () => useContext(ConfigScopeContext);

/** Suggestions matching what was typed: prefix matches first, then anywhere in the path. */
export function filterSuggestions(items: ReferenceSuggestion[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const starts = items.filter((i) => i.ref.toLowerCase().startsWith(q));
  const contains = items.filter((i) => !starts.includes(i) && i.ref.toLowerCase().includes(q));
  return [...starts, ...contains];
}

/** Id of a suggestion option, for aria-activedescendant. */
export const optionId = (listId: string, index: number) => `${listId}-opt-${index}`;
